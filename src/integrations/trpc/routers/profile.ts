import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "#/db"
import { profiles } from "#/db/schema"
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "../init"

function isValidAvatarUrl(value: string) {
	if (value.startsWith("/uploads/")) {
		return true
	}
	try {
		const url = new URL(value)
		return url.protocol === "https:" || url.protocol === "http:"
	} catch {
		return false
	}
}

const avatarUrlSchema = z
	.string()
	.max(500)
	.refine((value) => isValidAvatarUrl(value), {
		message: "Avatar URL must be an http(s) URL or /uploads path",
	})

export const profileRouter = createTRPCRouter({
	getCurrent: protectedProcedure.query(async ({ ctx }) => {
		const profile = await db.query.profiles.findFirst({
			where: eq(profiles.userId, ctx.userId),
		})
		if (!profile) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" })
		}
		return profile
	}),

	checkUsername: publicProcedure
		.input(z.object({ username: z.string().min(1).max(30) }))
		.query(async ({ input }) => {
			const existing = await db.query.profiles.findFirst({
				where: eq(profiles.username, input.username.toLowerCase()),
			})
			return { available: !existing }
		}),

	create: protectedProcedure
		.input(
			z.object({
				username: z
					.string()
					.min(2)
					.max(30)
					.regex(/^[a-z0-9_-]+$/),
				displayName: z.string().min(1).max(100).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const existing = await db.query.profiles.findFirst({
				where: eq(profiles.username, input.username.toLowerCase()),
			})
			if (existing) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Username already taken",
				})
			}
			const [profile] = await db
				.insert(profiles)
				.values({
					userId: ctx.userId,
					username: input.username.toLowerCase(),
					displayName: input.displayName ?? null,
				})
				.returning()
			return profile
		}),

	update: protectedProcedure
		.input(
			z.object({
				displayName: z.string().min(1).max(100).optional(),
				bio: z.string().max(300).optional(),
				avatarUrl: avatarUrlSchema.optional().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [updated] = await db
				.update(profiles)
				.set({
					displayName: input.displayName,
					bio: input.bio,
					avatarUrl: input.avatarUrl,
					updatedAt: new Date(),
				})
				.where(eq(profiles.userId, ctx.userId))
				.returning()
			if (!updated) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" })
			}
			return updated
		}),
})
