import { TRPCError } from "@trpc/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { links, profiles } from "#/db/schema";
import { BUTTON_STYLES, blocksSchema } from "#/lib/page-design";
import { isAllowedAvatarUrl, isSafeHttpUrl } from "#/lib/security";
import { themes } from "#/lib/themes";
import { createTRPCRouter, protectedProcedure } from "../init";
export const designRouter = createTRPCRouter({
	save: protectedProcedure
		.input(
			z.object({
				displayName: z.string().trim().min(1).max(100),
				bio: z.string().max(300),
				avatarUrl: z
					.string()
					.max(500)
					.refine((v) => !v || isAllowedAvatarUrl(v))
					.nullable(),
				theme: z.string().refine((v) => Object.hasOwn(themes, v)),
				fontFamily: z.enum(["work", "editorial", "mono"]),
				buttonStyle: z.enum(BUTTON_STYLES),
				accentColor: z
					.string()
					.regex(/^#[a-fA-F0-9]{6}$/)
					.nullable(),
				pageBackgroundType: z.enum(["theme", "color", "gradient", "image"]),
				contentBlocks: blocksSchema,
				linkEdits: z
					.array(
						z.object({
							id: z.string().uuid(),
							title: z.string().trim().min(1).max(100),
							url: z.string().max(2048).refine(isSafeHttpUrl),
						}),
					)
					.max(50)
					.refine((v) => new Set(v.map((x) => x.id)).size === v.length),
			}),
		)
		.mutation(async ({ ctx, input }) =>
			db.transaction(async (tx) => {
				const [profile] = await tx
					.select()
					.from(profiles)
					.where(eq(profiles.userId, ctx.userId))
					.for("update");
				if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
				const { linkEdits, ...design } = input;
				if (linkEdits.length) {
					const owned = await tx
						.select({ id: links.id })
						.from(links)
						.where(
							and(
								eq(links.profileId, profile.id),
								inArray(
									links.id,
									linkEdits.map((l) => l.id),
								),
							),
						);
					if (owned.length !== linkEdits.length)
						throw new TRPCError({
							code: "NOT_FOUND",
							message: "One of these links no longer exists",
						});
					const values = sql.join(
						linkEdits.map(
							(l) => sql`(${l.id}::uuid,${l.title}::text,${l.url}::text)`,
						),
						sql`,`,
					);
					await tx.execute(
						sql`update ${links} set title = edits.title, url = edits.url, health_state = case when ${links.url} <> edits.url then null else ${links.healthState} end, health_status_code = case when ${links.url} <> edits.url then null else ${links.healthStatusCode} end, health_final_url = case when ${links.url} <> edits.url then null else ${links.healthFinalUrl} end, health_checked_at = case when ${links.url} <> edits.url then null else ${links.healthCheckedAt} end, updated_at = now() from (values ${values}) as edits(id,title,url) where ${links.id} = edits.id and ${links.profileId} = ${profile.id}`,
					);
				}
				const [updated] = await tx
					.update(profiles)
					.set({
						...design,
						avatarUrl: design.avatarUrl || null,
						updatedAt: new Date(),
					})
					.where(eq(profiles.id, profile.id))
					.returning();
				return updated;
			}),
		),
});
