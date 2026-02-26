import { TRPCError } from "@trpc/server";
import { and, asc, eq, gte, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { linkSections, links, profiles } from "#/db/schema";
import { LINK_ICON_KEYS } from "#/lib/link-icon-keys";
import { normalizeObjectUrlForClient } from "#/lib/object-storage";
import { isSafeHttpUrl, normalizeHttpUrl } from "#/lib/security";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

const linkIconSchema = z.enum(LINK_ICON_KEYS);
const iconBgColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const sectionTitleSchema = z.string().trim().min(1).max(60);
const linkUrlSchema = z
	.string()
	.trim()
	.max(2048)
	.refine(isSafeHttpUrl, "URL must start with http:// or https://")
	.transform((value) => normalizeHttpUrl(value) ?? value);

type LinkRow = typeof links.$inferSelect;
type SectionRow = typeof linkSections.$inferSelect;

function getSectionOrderMap(sections: SectionRow[]) {
	return new Map(sections.map((section, index) => [section.id, index]));
}

function sortSections(sectionRows: SectionRow[]) {
	return [...sectionRows].sort((a, b) => {
		const sortOrderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
		if (sortOrderDiff !== 0) return sortOrderDiff;

		const createdDiff =
			(a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
		if (createdDiff !== 0) return createdDiff;

		return a.id.localeCompare(b.id);
	});
}

function sortLinksForLayout(linkRows: LinkRow[], sections: SectionRow[]) {
	const sectionOrder = getSectionOrderMap(sections);
	const fallbackSectionOrder = sections.length + 1;

	return [...linkRows].sort((a, b) => {
		const aSectionOrder =
			a.sectionId === null
				? -1
				: (sectionOrder.get(a.sectionId) ?? fallbackSectionOrder);
		const bSectionOrder =
			b.sectionId === null
				? -1
				: (sectionOrder.get(b.sectionId) ?? fallbackSectionOrder);

		if (aSectionOrder !== bSectionOrder) {
			return aSectionOrder - bSectionOrder;
		}

		const sortOrderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
		if (sortOrderDiff !== 0) return sortOrderDiff;

		const createdDiff =
			(a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
		if (createdDiff !== 0) return createdDiff;

		return a.id.localeCompare(b.id);
	});
}

function assertNoDuplicateIds(ids: string[], label: string) {
	if (new Set(ids).size !== ids.length) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `${label} contains duplicate ids`,
		});
	}
}

async function requireProfileByUserId(userId: string) {
	const profile = await db.query.profiles.findFirst({
		where: eq(profiles.userId, userId),
	});

	if (!profile) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Profile not found",
		});
	}

	return profile;
}

async function fetchProfileLayout(input: {
	profileId: string;
	onlyActiveLinks: boolean;
}) {
	const linkWhere = input.onlyActiveLinks
		? and(eq(links.profileId, input.profileId), eq(links.isActive, true))
		: eq(links.profileId, input.profileId);

	const [profileLinks, profileSections] = await Promise.all([
		db.query.links.findMany({
			where: linkWhere,
			orderBy: [asc(links.sortOrder), asc(links.createdAt), asc(links.id)],
		}),
		db.query.linkSections.findMany({
			where: eq(linkSections.profileId, input.profileId),
			orderBy: [
				asc(linkSections.sortOrder),
				asc(linkSections.createdAt),
				asc(linkSections.id),
			],
		}),
	]);

	const sortedSections = sortSections(profileSections);
	const sortedLinks = sortLinksForLayout(profileLinks, sortedSections);

	return {
		links: sortedLinks,
		sections: sortedSections,
	};
}

export const linksRouter = createTRPCRouter({
	list: protectedProcedure.query(async ({ ctx }) => {
		const profile = await requireProfileByUserId(ctx.userId);
		return fetchProfileLayout({
			profileId: profile.id,
			onlyActiveLinks: false,
		});
	}),

	add: protectedProcedure
		.input(
			z.object({
				title: z.string().min(1).max(100),
				url: linkUrlSchema,
				description: z.string().max(200).optional(),
				iconUrl: linkIconSchema.optional(),
				iconBgColor: iconBgColorSchema.optional(),
				isActive: z.boolean().default(true),
				sectionId: z.string().uuid().nullable().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const profile = await requireProfileByUserId(ctx.userId);

			if (input.sectionId) {
				const section = await db.query.linkSections.findFirst({
					where: and(
						eq(linkSections.id, input.sectionId),
						eq(linkSections.profileId, profile.id),
					),
				});
				if (!section) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Section not found",
					});
				}
			}

			const existing = await db.query.links.findMany({
				where: eq(links.profileId, profile.id),
			});
			const targetSectionId = input.sectionId ?? null;
			const nextSortOrder =
				existing
					.filter((link) => link.sectionId === targetSectionId)
					.reduce((max, link) => Math.max(max, link.sortOrder ?? -1), -1) + 1;

			const [link] = await db
				.insert(links)
				.values({
					profileId: profile.id,
					sectionId: targetSectionId,
					title: input.title,
					url: input.url,
					description: input.description ?? null,
					iconUrl: input.iconUrl ?? null,
					iconBgColor: input.iconBgColor ?? "#F5FF7B",
					isActive: input.isActive,
					sortOrder: nextSortOrder,
				})
				.returning();

			return link;
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				title: z.string().min(1).max(100).optional(),
				url: linkUrlSchema.optional(),
				description: z.string().max(200).optional().nullable(),
				iconUrl: linkIconSchema.optional().nullable(),
				iconBgColor: iconBgColorSchema.optional(),
				isActive: z.boolean().optional(),
				sectionId: z.string().uuid().optional().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const profile = await requireProfileByUserId(ctx.userId);
			const existingLink = await db.query.links.findFirst({
				where: and(eq(links.id, input.id), eq(links.profileId, profile.id)),
			});

			if (!existingLink) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
			}

			if (input.sectionId !== undefined && input.sectionId !== null) {
				const section = await db.query.linkSections.findFirst({
					where: and(
						eq(linkSections.id, input.sectionId),
						eq(linkSections.profileId, profile.id),
					),
				});
				if (!section) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Section not found",
					});
				}
			}

			const { id, ...data } = input;
			const [updated] = await db
				.update(links)
				.set({ ...data, updatedAt: new Date() })
				.where(and(eq(links.id, id), eq(links.profileId, profile.id)))
				.returning();

			if (!updated) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
			}

			return updated;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const profile = await requireProfileByUserId(ctx.userId);
			await db
				.delete(links)
				.where(and(eq(links.id, input.id), eq(links.profileId, profile.id)));
			return { success: true };
		}),

	reorder: protectedProcedure
		.input(
			z.object({
				sectionOrderIds: z.array(z.string().uuid()),
				unsectionedLinkIds: z.array(z.string().uuid()),
				sectionLinkOrders: z.array(
					z.object({
						sectionId: z.string().uuid(),
						linkIds: z.array(z.string().uuid()),
					}),
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const profile = await requireProfileByUserId(ctx.userId);
			const [profileLinks, profileSections] = await Promise.all([
				db.query.links.findMany({
					where: eq(links.profileId, profile.id),
				}),
				db.query.linkSections.findMany({
					where: eq(linkSections.profileId, profile.id),
				}),
			]);

			assertNoDuplicateIds(input.sectionOrderIds, "Section order");
			assertNoDuplicateIds(input.unsectionedLinkIds, "Unsectioned links");
			for (const sectionOrder of input.sectionLinkOrders) {
				assertNoDuplicateIds(
					sectionOrder.linkIds,
					`Links for section ${sectionOrder.sectionId}`,
				);
			}

			const sectionIds = profileSections.map((section) => section.id);
			const validSectionIdSet = new Set(sectionIds);

			if (input.sectionOrderIds.length !== sectionIds.length) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Section order is missing sections",
				});
			}

			if (
				!input.sectionOrderIds.every((sectionId) =>
					validSectionIdSet.has(sectionId),
				)
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Section order contains unknown section ids",
				});
			}

			const sectionLinkMap = new Map(
				input.sectionLinkOrders.map((sectionOrder) => [
					sectionOrder.sectionId,
					sectionOrder.linkIds,
				]),
			);

			if (sectionLinkMap.size !== sectionIds.length) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Section link layout is incomplete",
				});
			}

			for (const sectionId of sectionIds) {
				if (!sectionLinkMap.has(sectionId)) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Section link layout is incomplete",
					});
				}
			}

			const validLinkIdSet = new Set(profileLinks.map((link) => link.id));
			const allLayoutLinkIds = [
				...input.unsectionedLinkIds,
				...input.sectionLinkOrders.flatMap(
					(sectionOrder) => sectionOrder.linkIds,
				),
			];

			assertNoDuplicateIds(allLayoutLinkIds, "Link layout");

			if (allLayoutLinkIds.length !== profileLinks.length) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Layout is missing one or more links",
				});
			}

			if (!allLayoutLinkIds.every((linkId) => validLinkIdSet.has(linkId))) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Layout contains unknown link ids",
				});
			}

			await db.transaction(async (tx) => {
				await Promise.all(
					input.sectionOrderIds.map((sectionId, index) =>
						tx
							.update(linkSections)
							.set({
								sortOrder: index,
								updatedAt: new Date(),
							})
							.where(
								and(
									eq(linkSections.id, sectionId),
									eq(linkSections.profileId, profile.id),
								),
							),
					),
				);

				await Promise.all(
					input.unsectionedLinkIds.map((linkId, index) =>
						tx
							.update(links)
							.set({
								sectionId: null,
								sortOrder: index,
								updatedAt: new Date(),
							})
							.where(
								and(eq(links.id, linkId), eq(links.profileId, profile.id)),
							),
					),
				);

				for (const sectionOrder of input.sectionLinkOrders) {
					await Promise.all(
						sectionOrder.linkIds.map((linkId, index) =>
							tx
								.update(links)
								.set({
									sectionId: sectionOrder.sectionId,
									sortOrder: index,
									updatedAt: new Date(),
								})
								.where(
									and(eq(links.id, linkId), eq(links.profileId, profile.id)),
								),
						),
					);
				}
			});

			return { success: true };
		}),

	createSection: protectedProcedure
		.input(
			z.object({
				title: sectionTitleSchema,
				sourceSectionId: z.string().uuid().nullable().optional().default(null),
				splitIndex: z.number().int().min(0),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const profile = await requireProfileByUserId(ctx.userId);
			const layout = await fetchProfileLayout({
				profileId: profile.id,
				onlyActiveLinks: false,
			});

			const sourceSectionId = input.sourceSectionId ?? null;
			const sourceSection = sourceSectionId
				? layout.sections.find((section) => section.id === sourceSectionId)
				: null;

			if (sourceSectionId && !sourceSection) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Section not found",
				});
			}

			const sourceLinks = layout.links.filter(
				(link) => link.sectionId === sourceSectionId,
			);

			if (input.splitIndex > sourceLinks.length) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invalid split position",
				});
			}

			const insertSortOrder = sourceSection
				? (sourceSection.sortOrder ?? 0) + 1
				: 0;
			const movedLinks = sourceLinks.slice(input.splitIndex);
			const remainingLinks = sourceLinks.slice(0, input.splitIndex);

			const createdSection = await db.transaction(async (tx) => {
				await tx
					.update(linkSections)
					.set({
						sortOrder: sql`${linkSections.sortOrder} + 1`,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(linkSections.profileId, profile.id),
							gte(linkSections.sortOrder, insertSortOrder),
						),
					);

				const [created] = await tx
					.insert(linkSections)
					.values({
						profileId: profile.id,
						title: input.title,
						sortOrder: insertSortOrder,
					})
					.returning();

				await Promise.all(
					remainingLinks.map((link, index) =>
						tx
							.update(links)
							.set({
								sectionId: sourceSectionId,
								sortOrder: index,
								updatedAt: new Date(),
							})
							.where(
								and(eq(links.id, link.id), eq(links.profileId, profile.id)),
							),
					),
				);

				await Promise.all(
					movedLinks.map((link, index) =>
						tx
							.update(links)
							.set({
								sectionId: created.id,
								sortOrder: index,
								updatedAt: new Date(),
							})
							.where(
								and(eq(links.id, link.id), eq(links.profileId, profile.id)),
							),
					),
				);

				return created;
			});

			return createdSection;
		}),

	updateSection: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				title: sectionTitleSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const profile = await requireProfileByUserId(ctx.userId);

			const [updated] = await db
				.update(linkSections)
				.set({
					title: input.title,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(linkSections.id, input.id),
						eq(linkSections.profileId, profile.id),
					),
				)
				.returning();

			if (!updated) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Section not found",
				});
			}

			return updated;
		}),

	deleteSection: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const profile = await requireProfileByUserId(ctx.userId);
			const section = await db.query.linkSections.findFirst({
				where: and(
					eq(linkSections.id, input.id),
					eq(linkSections.profileId, profile.id),
				),
			});

			if (!section) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Section not found",
				});
			}

			const [sectionLinks, unsectionedLinks] = await Promise.all([
				db.query.links.findMany({
					where: and(
						eq(links.profileId, profile.id),
						eq(links.sectionId, input.id),
					),
					orderBy: [asc(links.sortOrder), asc(links.createdAt), asc(links.id)],
				}),
				db.query.links.findMany({
					where: and(eq(links.profileId, profile.id), isNull(links.sectionId)),
					orderBy: [asc(links.sortOrder), asc(links.createdAt), asc(links.id)],
				}),
			]);

			await db.transaction(async (tx) => {
				await Promise.all(
					unsectionedLinks.map((link, index) =>
						tx
							.update(links)
							.set({
								sectionId: null,
								sortOrder: index,
								updatedAt: new Date(),
							})
							.where(
								and(eq(links.id, link.id), eq(links.profileId, profile.id)),
							),
					),
				);

				await Promise.all(
					sectionLinks.map((link, index) =>
						tx
							.update(links)
							.set({
								sectionId: null,
								sortOrder: unsectionedLinks.length + index,
								updatedAt: new Date(),
							})
							.where(
								and(eq(links.id, link.id), eq(links.profileId, profile.id)),
							),
					),
				);

				await tx
					.delete(linkSections)
					.where(
						and(
							eq(linkSections.id, input.id),
							eq(linkSections.profileId, profile.id),
						),
					);

				await tx
					.update(linkSections)
					.set({
						sortOrder: sql`${linkSections.sortOrder} - 1`,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(linkSections.profileId, profile.id),
							gte(linkSections.sortOrder, (section.sortOrder ?? 0) + 1),
						),
					);
			});

			return { success: true };
		}),

	getPublic: publicProcedure
		.input(z.object({ username: z.string() }))
		.query(async ({ input }) => {
			const profile = await db.query.profiles.findFirst({
				where: eq(profiles.username, input.username.toLowerCase()),
			});
			if (!profile) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Profile not found",
				});
			}

			const layout = await fetchProfileLayout({
				profileId: profile.id,
				onlyActiveLinks: true,
			});

			const sections = layout.sections
				.map((section) => ({
					...section,
					links: layout.links.filter((link) => link.sectionId === section.id),
				}))
				.filter((section) => section.links.length > 0);

			const unsectionedLinks = layout.links.filter(
				(link) => link.sectionId === null,
			);

			return {
				profile: {
					...profile,
					avatarUrl: normalizeObjectUrlForClient(profile.avatarUrl),
					pageBackgroundImageUrl: normalizeObjectUrlForClient(
						profile.pageBackgroundImageUrl,
					),
				},
				links: layout.links,
				sections,
				unsectionedLinks,
			};
		}),
});
