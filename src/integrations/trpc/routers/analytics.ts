import { TRPCError } from "@trpc/server"
import { and, asc, desc, eq, sql } from "drizzle-orm"
import { z } from "zod"
import { db } from "#/db"
import { clickEvents, links, profiles } from "#/db/schema"
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "../init"

export const analyticsRouter = createTRPCRouter({
	recordClick: publicProcedure
		.input(
			z.object({
				linkId: z.string().uuid(),
				profileId: z.string().uuid(),
				referrer: z.string().optional(),
				userAgent: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await db.insert(clickEvents).values({
				linkId: input.linkId,
				profileId: input.profileId,
				referrer: input.referrer ?? ctx.request.headers.get("referer") ?? null,
				userAgent:
					input.userAgent ??
					ctx.request.headers.get("user-agent") ??
					null,
			})
			return { success: true }
		}),

	getSummary: protectedProcedure.query(async ({ ctx }) => {
		const profile = await db.query.profiles.findFirst({
			where: eq(profiles.userId, ctx.userId),
		})
		if (!profile) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" })
		}

		const totalClicks = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(clickEvents)
			.where(eq(clickEvents.profileId, profile.id))

		const clicksLast24h = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(clickEvents)
			.where(
				and(
					eq(clickEvents.profileId, profile.id),
					sql`${clickEvents.clickedAt} >= now() - interval '24 hours'`,
				),
			)

		const clicksLast7d = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(clickEvents)
			.where(
				and(
					eq(clickEvents.profileId, profile.id),
					sql`${clickEvents.clickedAt} >= now() - interval '7 days'`,
				),
			)

		const uniqueReferrers = await db
			.select({
				count: sql<number>`count(distinct nullif(${clickEvents.referrer}, ''))::int`,
			})
			.from(clickEvents)
			.where(eq(clickEvents.profileId, profile.id))

		const directClicks = await db
			.select({
				count: sql<number>`count(*) filter (where ${clickEvents.referrer} is null or btrim(${clickEvents.referrer}) = '')::int`,
			})
			.from(clickEvents)
			.where(eq(clickEvents.profileId, profile.id))

		const clicksByLink = await db
			.select({
				linkId: clickEvents.linkId,
				count: sql<number>`count(*)::int`,
				title: links.title,
				url: links.url,
			})
			.from(clickEvents)
			.leftJoin(links, eq(clickEvents.linkId, links.id))
			.where(eq(clickEvents.profileId, profile.id))
			.groupBy(clickEvents.linkId, links.title, links.url)
			.orderBy(desc(sql`count(*)`))

		const referrerSourceExpr =
			sql<string>`coalesce(nullif(split_part(regexp_replace(${clickEvents.referrer}, '^https?://(www\\.)?', ''), '/', 1), ''), 'Direct')`

		const topReferrers = await db
			.select({
				source: referrerSourceExpr,
				count: sql<number>`count(*)::int`,
			})
			.from(clickEvents)
			.where(eq(clickEvents.profileId, profile.id))
			.groupBy(referrerSourceExpr)
			.orderBy(desc(sql`count(*)`))
			.limit(8)

		const dayExpr = sql`date_trunc('day', ${clickEvents.clickedAt})`

		const clicksByDay = await db
			.select({
				day: sql<string>`to_char(${dayExpr}, 'YYYY-MM-DD')`,
				count: sql<number>`count(*)::int`,
			})
			.from(clickEvents)
			.where(
				and(
					eq(clickEvents.profileId, profile.id),
					sql`${clickEvents.clickedAt} >= now() - interval '6 days'`,
				),
			)
			.groupBy(dayExpr)
			.orderBy(asc(dayExpr))

		const recentClicks = await db
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
			.where(eq(clickEvents.profileId, profile.id))
			.orderBy(desc(clickEvents.clickedAt))
			.limit(50)

		return {
			totalClicks: totalClicks[0]?.count ?? 0,
			clicksLast24h: clicksLast24h[0]?.count ?? 0,
			clicksLast7d: clicksLast7d[0]?.count ?? 0,
			uniqueReferrers: uniqueReferrers[0]?.count ?? 0,
			directClicks: directClicks[0]?.count ?? 0,
			clicksByLink,
			topReferrers,
			clicksByDay,
			recentClicks,
		}
	}),
})
