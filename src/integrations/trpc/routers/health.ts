import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { links, profiles } from "#/db/schema";
import { hashClickKey } from "#/lib/click-protection";
import {
	cleanupClickGuards,
	consumeClickBudget,
} from "#/lib/click-protection-server";
import { inspectLink } from "#/lib/link-health";
import { createTRPCRouter, protectedProcedure } from "../init";
export const healthRouter = createTRPCRouter({
	check: protectedProcedure
		.input(z.object({ ids: z.array(z.string().uuid()).min(1).max(10) }))
		.mutation(async ({ ctx, input }) => {
			const profile = await db.query.profiles.findFirst({
				where: eq(profiles.userId, ctx.userId),
			});
			if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
			const owned = await db.query.links.findMany({
				where: and(
					eq(links.profileId, profile.id),
					inArray(links.id, input.ids),
				),
				orderBy: asc(links.sortOrder),
			});
			if (owned.length !== new Set(input.ids).size)
				throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
			await cleanupClickGuards(db);
			if (
				!(await consumeClickBudget(
					db,
					hashClickKey(process.env.BETTER_AUTH_SECRET ?? "local", [
						"health",
						profile.id,
					]),
					1,
					30,
				))
			)
				throw new TRPCError({
					code: "TOO_MANY_REQUESTS",
					message: "Wait 30 seconds before checking another batch",
				});
			const results = [];
			for (let i = 0; i < owned.length; i += 3) {
				const batch = await Promise.all(
					owned.slice(i, i + 3).map(async (link) => {
						const result = await inspectLink(link.url);
						const [updated] = await db
							.update(links)
							.set({ ...result, healthCheckedAt: new Date() })
							.where(
								and(
									eq(links.id, link.id),
									eq(links.profileId, profile.id),
									eq(links.url, link.url),
								),
							)
							.returning({ id: links.id });
						return { id: link.id, ...result, saved: Boolean(updated) };
					}),
				);
				results.push(...batch);
			}
			return results;
		}),
});
