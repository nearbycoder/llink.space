import { TRPCError } from "@trpc/server"
import { and, asc, eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "#/db"
import { links, profiles } from "#/db/schema"
import { LINK_ICON_KEYS } from "#/lib/link-icon-keys"
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "../init"

const linkIconSchema = z.enum(LINK_ICON_KEYS)

export const linksRouter = createTRPCRouter({
	list: protectedProcedure.query(async ({ ctx }) => {
		const profile = await db.query.profiles.findFirst({
			where: eq(profiles.userId, ctx.userId),
		})
		if (!profile) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" })
		}
		return db.query.links.findMany({
			where: eq(links.profileId, profile.id),
			orderBy: [asc(links.sortOrder), asc(links.createdAt)],
		})
	}),

	add: protectedProcedure
		.input(
			z.object({
				title: z.string().min(1).max(100),
				url: z.string().url(),
				description: z.string().max(200).optional(),
				iconUrl: linkIconSchema.optional(),
				isActive: z.boolean().default(true),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const profile = await db.query.profiles.findFirst({
				where: eq(profiles.userId, ctx.userId),
			})
			if (!profile) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" })
			}
			const existing = await db.query.links.findMany({
				where: eq(links.profileId, profile.id),
			})
			const [link] = await db
				.insert(links)
				.values({
					profileId: profile.id,
					title: input.title,
					url: input.url,
					description: input.description ?? null,
					iconUrl: input.iconUrl ?? null,
					isActive: input.isActive,
					sortOrder: existing.length,
				})
				.returning()
			return link
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				title: z.string().min(1).max(100).optional(),
				url: z.string().url().optional(),
				description: z.string().max(200).optional().nullable(),
				iconUrl: linkIconSchema.optional().nullable(),
				isActive: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const profile = await db.query.profiles.findFirst({
				where: eq(profiles.userId, ctx.userId),
			})
			if (!profile) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" })
			}
			const { id, ...data } = input
			const [updated] = await db
				.update(links)
				.set({ ...data, updatedAt: new Date() })
				.where(and(eq(links.id, id), eq(links.profileId, profile.id)))
				.returning()
			if (!updated) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" })
			}
			return updated
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const profile = await db.query.profiles.findFirst({
				where: eq(profiles.userId, ctx.userId),
			})
			if (!profile) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" })
			}
			await db
				.delete(links)
				.where(and(eq(links.id, input.id), eq(links.profileId, profile.id)))
			return { success: true }
		}),

	reorder: protectedProcedure
		.input(z.object({ ids: z.array(z.string().uuid()) }))
		.mutation(async ({ ctx, input }) => {
			const profile = await db.query.profiles.findFirst({
				where: eq(profiles.userId, ctx.userId),
			})
			if (!profile) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" })
			}
			await Promise.all(
				input.ids.map((id, index) =>
					db
						.update(links)
						.set({ sortOrder: index })
						.where(and(eq(links.id, id), eq(links.profileId, profile.id))),
				),
			)
			return { success: true }
		}),

	getPublic: publicProcedure
		.input(z.object({ username: z.string() }))
		.query(async ({ input }) => {
			const profile = await db.query.profiles.findFirst({
				where: eq(profiles.username, input.username.toLowerCase()),
			})
			if (!profile) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" })
			}
			const profileLinks = await db.query.links.findMany({
				where: and(
					eq(links.profileId, profile.id),
					eq(links.isActive, true),
				),
				orderBy: [asc(links.sortOrder), asc(links.createdAt)],
			})
			return { profile, links: profileLinks }
		}),
})
