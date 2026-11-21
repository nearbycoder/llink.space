import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { clickEvents, links, profiles } from "#/db/schema";
import { analyticsRangeStart, fillDailyClicks } from "#/lib/analytics-tools";
import {
	CLICK_DEDUP_SECONDS,
	CLICK_LIMIT_PER_MINUTE,
	isKnownCrawler,
} from "#/lib/click-protection";
import {
	cleanupClickGuards,
	clickGuardKeys,
	consumeClickBudget,
} from "#/lib/click-protection-server";
import { publishedLinkFilter } from "#/lib/link-publishing-server";
import { normalizeHttpUrl } from "#/lib/security";
import { fillClickHeatmap, summarizeDevices } from "#/lib/traffic-insights";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

export async function fetchAnalyticsSummary(
	profileId: string,
	days: 7 | 30 | 90,
) {
	const now = new Date();
	const rangeStart = analyticsRangeStart(days, now);
	const previousStart = new Date(rangeStart.getTime() - days * 86400000);
	const rangeWhere = and(
		eq(clickEvents.profileId, profileId),
		gte(clickEvents.clickedAt, rangeStart),
	);

	const referrerSourceExpr = sql<string>`coalesce(nullif(split_part(split_part(split_part(regexp_replace(${clickEvents.referrer}, '^https?://(www\\.)?', ''), '/', 1), '?', 1), '#', 1), ''), 'Direct')`;
	const dayExpr = sql`date_trunc('day', ${clickEvents.clickedAt})`;
	const weekdayExpr = sql<number>`extract(isodow from ${clickEvents.clickedAt})::int`;
	const hourExpr = sql<number>`extract(hour from ${clickEvents.clickedAt})::int`;
	const isUnknownUa = sql`nullif(btrim(${clickEvents.userAgent}), '') is null`;
	const isTabletUa = sql`not (${isUnknownUa}) and (${clickEvents.userAgent} ~* '(ipad|tablet|silk|kindle)' or (${clickEvents.userAgent} ~* 'android' and ${clickEvents.userAgent} !~* 'mobile'))`;
	const isMobileUa = sql`not (${isUnknownUa}) and not (${isTabletUa}) and ${clickEvents.userAgent} ~* '(mobile|iphone|ipod|android)'`;
	const isDesktopUa = sql`not (${isUnknownUa}) and not (${isTabletUa}) and not (${isMobileUa})`;

	// Fold totals and fixed device buckets into one profile scan, keeping the
	// remaining range-scoped queries aligned with the profile/date index.
	const [
		totals,
		clicksByLink,
		topReferrers,
		clicksByDay,
		recentClicks,
		heatmapRows,
	] = await Promise.all([
		db
			.select({
				totalClicks: sql<number>`count(*)::int`,
				clicksLast24h: sql<number>`count(*) filter (where ${clickEvents.clickedAt} >= ${new Date(now.getTime() - 86400000)})::int`,
				clicksLast7d: sql<number>`count(*) filter (where ${clickEvents.clickedAt} >= ${new Date(now.getTime() - 7 * 86400000)})::int`,
				previousPeriodClicks: sql<number>`count(*) filter (where ${clickEvents.clickedAt} >= ${previousStart} and ${clickEvents.clickedAt} < ${rangeStart})::int`,
				periodClicks: sql<number>`count(*) filter (where ${clickEvents.clickedAt} >= ${rangeStart})::int`,
				uniqueReferrers: sql<number>`count(distinct ${referrerSourceExpr}) filter (where ${clickEvents.clickedAt} >= ${rangeStart} and nullif(btrim(${clickEvents.referrer}), '') is not null)::int`,
				directClicks: sql<number>`count(*) filter (where ${clickEvents.clickedAt} >= ${rangeStart} and nullif(btrim(${clickEvents.referrer}), '') is null)::int`,
				desktopClicks: sql<number>`count(*) filter (where ${clickEvents.clickedAt} >= ${rangeStart} and ${isDesktopUa})::int`,
				mobileClicks: sql<number>`count(*) filter (where ${clickEvents.clickedAt} >= ${rangeStart} and ${isMobileUa})::int`,
				tabletClicks: sql<number>`count(*) filter (where ${clickEvents.clickedAt} >= ${rangeStart} and ${isTabletUa})::int`,
				unknownClicks: sql<number>`count(*) filter (where ${clickEvents.clickedAt} >= ${rangeStart} and ${isUnknownUa})::int`,
			})
			.from(clickEvents)
			.where(eq(clickEvents.profileId, profileId)),
		db
			.select({
				linkId: clickEvents.linkId,
				previousCount: sql<number>`count(*) filter (where ${clickEvents.clickedAt} < ${rangeStart})::int`,
				count: sql<number>`count(*) filter (where ${clickEvents.clickedAt} >= ${rangeStart})::int`,
				title: links.title,
				url: links.url,
			})
			.from(clickEvents)
			.leftJoin(links, eq(clickEvents.linkId, links.id))
			.where(
				and(
					eq(clickEvents.profileId, profileId),
					gte(clickEvents.clickedAt, previousStart),
				),
			)
			.groupBy(clickEvents.linkId, links.title, links.url)
			.orderBy(
				desc(
					sql`count(*) filter (where ${clickEvents.clickedAt} >= ${rangeStart})`,
				),
			),

		db
			.select({
				source: referrerSourceExpr,
				count: sql<number>`count(*)::int`,
			})
			.from(clickEvents)
			.where(rangeWhere)
			.groupBy(referrerSourceExpr)
			.orderBy(desc(sql`count(*)`))
			.limit(8),

		db
			.select({
				day: sql<string>`to_char(${dayExpr}, 'YYYY-MM-DD')`,
				count: sql<number>`count(*)::int`,
			})
			.from(clickEvents)
			.where(rangeWhere)
			.groupBy(dayExpr)
			.orderBy(asc(dayExpr)),

		db
			.select({
				id: clickEvents.id,
				linkId: clickEvents.linkId,
				referrer: clickEvents.referrer,
				userAgent: clickEvents.userAgent,
				country: clickEvents.country,
				clickedAt: clickEvents.clickedAt,
				linkTitle: links.title,
				linkUrl: links.url,
			})
			.from(clickEvents)
			.leftJoin(links, eq(clickEvents.linkId, links.id))
			.where(rangeWhere)
			.orderBy(desc(clickEvents.clickedAt))
			.limit(12),
		db
			.select({
				weekday: weekdayExpr,
				hour: hourExpr,
				count: sql<number>`count(*)::int`,
			})
			.from(clickEvents)
			.where(rangeWhere)
			.groupBy(weekdayExpr, hourExpr),
	]);

	const summaryRow = totals[0];
	const deviceRows = [
		{ device: "Desktop", count: summaryRow?.desktopClicks ?? 0 },
		{ device: "Mobile", count: summaryRow?.mobileClicks ?? 0 },
		{ device: "Tablet", count: summaryRow?.tabletClicks ?? 0 },
		{ device: "Unknown", count: summaryRow?.unknownClicks ?? 0 },
	];

	return {
		devices: summarizeDevices(deviceRows),
		clickHeatmap: fillClickHeatmap(heatmapRows),
		rangeDays: days,
		previousPeriodClicks: summaryRow?.previousPeriodClicks ?? 0,
		previousRangeStart: previousStart.toISOString().slice(0, 10),
		previousRangeEnd: new Date(rangeStart.getTime() - 1)
			.toISOString()
			.slice(0, 10),
		periodClicks: summaryRow?.periodClicks ?? 0,
		totalClicks: summaryRow?.totalClicks ?? 0,
		clicksLast24h: summaryRow?.clicksLast24h ?? 0,
		clicksLast7d: summaryRow?.clicksLast7d ?? 0,
		uniqueReferrers: summaryRow?.uniqueReferrers ?? 0,
		directClicks: summaryRow?.directClicks ?? 0,
		clicksByLink,
		topReferrers,
		rangeStart: rangeStart.toISOString().slice(0, 10),
		rangeEnd: now.toISOString().slice(0, 10),
		clicksByDay: fillDailyClicks(clicksByDay, days, now),
		recentClicks,
	};
}

export const analyticsRouter = createTRPCRouter({
	recordClick: publicProcedure
		.input(
			z.object({
				linkId: z.string().uuid(),
				profileId: z.string().uuid(),
				referrer: z.string().trim().max(2048).optional(),
				userAgent: z.string().trim().max(512).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (isKnownCrawler(ctx.request.headers.get("user-agent") ?? ""))
				return { success: true };
			const profileLink = await db.query.links.findFirst({
				where: and(
					eq(links.id, input.linkId),
					eq(links.profileId, input.profileId),
					publishedLinkFilter(),
				),
			});
			if (!profileLink) {
				// Ignore forged or stale click payloads to avoid profile event poisoning.
				return { success: true };
			}

			const normalizedReferrer = normalizeHttpUrl(
				input.referrer ?? ctx.request.headers.get("referer") ?? "",
			);
			const userAgent =
				ctx.request.headers.get("user-agent")?.slice(0, 512) ?? null;
			const keys = clickGuardKeys(
				ctx.request,
				profileLink.profileId,
				profileLink.id,
				normalizedReferrer ?? "",
			);
			await cleanupClickGuards(db);
			await db.transaction(async (tx) => {
				if (
					!(await consumeClickBudget(tx, keys.rate, CLICK_LIMIT_PER_MINUTE, 60))
				)
					return;
				if (
					!(await consumeClickBudget(
						tx,
						keys.duplicate,
						1,
						CLICK_DEDUP_SECONDS,
					))
				)
					return;
				await tx.insert(clickEvents).values({
					linkId: profileLink.id,
					profileId: profileLink.profileId,
					referrer: normalizedReferrer,
					userAgent,
				});
			});
			return { success: true };
		}),

	getSummary: protectedProcedure
		.input(
			z.object({
				days: z.union([z.literal(7), z.literal(30), z.literal(90)]),
			}),
		)
		.query(async ({ ctx, input }) => {
			const [profile] = await db
				.select({ id: profiles.id })
				.from(profiles)
				.where(eq(profiles.userId, ctx.userId))
				.limit(1);
			if (!profile) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Profile not found",
				});
			}

			return fetchAnalyticsSummary(profile.id, input.days);
		}),
});
