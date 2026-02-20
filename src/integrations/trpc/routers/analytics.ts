import { TRPCError } from "@trpc/server"
import { desc, eq, sql } from "drizzle-orm"
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

		const recentClicks = await db.query.clickEvents.findMany({
			where: eq(clickEvents.profileId, profile.id),
			orderBy: [desc(clickEvents.clickedAt)],
			limit: 50,
		})

		return {
			totalClicks: totalClicks[0]?.count ?? 0,
			clicksByLink,
			recentClicks,
		}
	}),
})
