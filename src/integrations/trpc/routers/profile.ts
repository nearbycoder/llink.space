import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { profiles } from "#/db/schema";
import { normalizeObjectUrlForClient } from "#/lib/object-storage";
import {
	isProfileBackgroundColorId,
	isProfileBackgroundGradientId,
	PROFILE_BACKGROUND_TYPES,
} from "#/lib/profile-backgrounds";
import {
	isAllowedAvatarUrl,
	isAllowedBackgroundImageUrl,
} from "#/lib/security";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

const avatarUrlSchema = z
	.string()
	.max(500)
	.refine((value) => isAllowedAvatarUrl(value), {
		message:
			"Avatar URL must be an http(s) URL, /uploads path, or /api/storage path (SVG not allowed)",
	});

const backgroundColorIdSchema = z
	.string()
	.max(40)
	.refine((value) => isProfileBackgroundColorId(value), {
		message: "Invalid background color option",
	});

const backgroundGradientIdSchema = z
	.string()
	.max(40)
	.refine((value) => isProfileBackgroundGradientId(value), {
		message: "Invalid background gradient option",
	});

const backgroundImageUrlSchema = z
	.string()
	.max(500)
	.refine((value) => isAllowedBackgroundImageUrl(value), {
		message:
			"Background URL must be an http(s) URL, /uploads path, or /api/storage path (SVG not allowed)",
	});

export const profileRouter = createTRPCRouter({
	getCurrent: protectedProcedure.query(async ({ ctx }) => {
		const profile = await db.query.profiles.findFirst({
			where: eq(profiles.userId, ctx.userId),
		});
		if (!profile) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
		}
		return {
			...profile,
			avatarUrl: normalizeObjectUrlForClient(profile.avatarUrl),
			pageBackgroundImageUrl: normalizeObjectUrlForClient(
				profile.pageBackgroundImageUrl,
			),
		};
	}),

	checkUsername: publicProcedure
		.input(z.object({ username: z.string().min(1).max(30) }))
		.query(async ({ input }) => {
			const existing = await db.query.profiles.findFirst({
				where: eq(profiles.username, input.username.toLowerCase()),
			});
			return { available: !existing };
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
			});
			if (existing) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Username already taken",
				});
			}
			const [profile] = await db
				.insert(profiles)
				.values({
					userId: ctx.userId,
					username: input.username.toLowerCase(),
					displayName: input.displayName ?? null,
				})
				.returning();
			return profile;
		}),

	update: protectedProcedure
		.input(
			z.object({
				displayName: z.string().min(1).max(100).optional(),
				bio: z.string().max(300).optional(),
				avatarUrl: avatarUrlSchema.optional().nullable(),
				pageBackgroundType: z.enum(PROFILE_BACKGROUND_TYPES).optional(),
				pageBackgroundColor: backgroundColorIdSchema.optional(),
				pageBackgroundGradient: backgroundGradientIdSchema.optional(),
				pageBackgroundImageUrl: backgroundImageUrlSchema.optional().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const normalizedAvatarUrl =
				input.avatarUrl === undefined || input.avatarUrl === null
					? input.avatarUrl
					: normalizeObjectUrlForClient(input.avatarUrl);
			const normalizedBackgroundImageUrl =
				input.pageBackgroundImageUrl === undefined ||
				input.pageBackgroundImageUrl === null
					? input.pageBackgroundImageUrl
					: normalizeObjectUrlForClient(input.pageBackgroundImageUrl);

			if (
				input.pageBackgroundType === "image" &&
				!normalizedBackgroundImageUrl?.trim()
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Custom background image is required for image mode",
				});
			}

			const [updated] = await db
				.update(profiles)
				.set({
					displayName: input.displayName,
					bio: input.bio,
					avatarUrl: normalizedAvatarUrl,
					pageBackgroundType: input.pageBackgroundType,
					pageBackgroundColor: input.pageBackgroundColor,
					pageBackgroundGradient: input.pageBackgroundGradient,
					pageBackgroundImageUrl: normalizedBackgroundImageUrl,
					updatedAt: new Date(),
				})
				.where(eq(profiles.userId, ctx.userId))
				.returning();
			if (!updated) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Profile not found",
				});
			}
			return {
				...updated,
				avatarUrl: normalizeObjectUrlForClient(updated.avatarUrl),
				pageBackgroundImageUrl: normalizeObjectUrlForClient(
					updated.pageBackgroundImageUrl,
				),
			};
		}),
});
