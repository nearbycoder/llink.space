import { TRPCError } from "@trpc/server";
import { and, asc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { linkSections, links, profiles } from "#/db/schema";
import {
	batchOperationSchema,
	previewBatchLinks,
} from "#/lib/batch-link-tools";
import { parseLinkCatalog } from "#/lib/link-catalog";
import { LINK_ICON_KEYS } from "#/lib/link-icon-keys";
import { MAX_IMPORT_LINKS, parseLinkImport } from "#/lib/link-import";
import { validSchedule } from "#/lib/link-publishing";
import { fetchPublicProfileByUsername } from "#/lib/public-profile.server";
import {
	isAllowedAvatarUrl,
	isSafeHttpUrl,
	normalizeHttpUrl,
	prepareHttpUrl,
} from "#/lib/security";
import { DEFAULT_ICON_BG_COLOR } from "#/lib/utils";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

const publishingFields = {
	featured: z.boolean().optional(),
	featureImageUrl: z
		.string()
		.max(500)
		.refine(isAllowedAvatarUrl)
		.nullable()
		.optional(),
	ctaLabel: z.string().trim().max(40).nullable().optional(),
	publishAt: z.string().datetime().nullable().optional(),
	expireAt: z.string().datetime().nullable().optional(),
};
function assertSchedule(link: Parameters<typeof validSchedule>[0]) {
	if (!validSchedule(link))
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "End time must be after publish time",
		});
}

const linkIconSchema = z.enum(LINK_ICON_KEYS);
const iconBgColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const sectionTitleSchema = z.string().trim().min(1).max(60);
const linkUrlSchema = z
	.string()
	.trim()
	.transform(prepareHttpUrl)
	.pipe(
		z
			.string()
			.max(2048)
			.refine(isSafeHttpUrl, "Enter a valid website URL")
			.transform((value) => normalizeHttpUrl(value) ?? value),
	);

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

export async function fetchProfileLayout(
	input: {
		profileId: string;
	},
	executor?: Parameters<Parameters<typeof db.transaction>[0]>[0],
) {
	// Keep queries sequential on a single transaction client (pg deprecates
	// overlapping client.query() calls on one connection), parallel on the pool.
	let profileLinks: LinkRow[];
	let profileSections: SectionRow[];
	if (executor) {
		profileLinks = await executor.query.links.findMany({
			where: eq(links.profileId, input.profileId),
			orderBy: [asc(links.sortOrder), asc(links.createdAt), asc(links.id)],
		});
		profileSections = await executor.query.linkSections.findMany({
			where: eq(linkSections.profileId, input.profileId),
			orderBy: [
				asc(linkSections.sortOrder),
				asc(linkSections.createdAt),
				asc(linkSections.id),
			],
		});
	} else {
		[profileLinks, profileSections] = await Promise.all([
			db.query.links.findMany({
				where: eq(links.profileId, input.profileId),
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
	}

	const sortedSections = sortSections(profileSections);
	const sortedLinks = sortLinksForLayout(profileLinks, sortedSections);

	return {
		links: sortedLinks,
		sections: sortedSections,
	};
}

async function applyLinkPositions(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	profileId: string,
	entries: Array<{ id: string; sectionId: string | null; sortOrder: number }>,
) {
	if (!entries.length) return;
	const positions = entries.map((entry) =>
		entry.sectionId === null
			? sql`(${entry.id}::uuid, null::uuid, ${entry.sortOrder}::int)`
			: sql`(${entry.id}::uuid, ${entry.sectionId}::uuid, ${entry.sortOrder}::int)`,
	);
	// Chunk parameters to remain below PostgreSQL's bind limit for large profiles.
	for (let offset = 0; offset < positions.length; offset += 1000) {
		await tx.execute(sql`update ${links} set section_id = position.section_id, sort_order = position.sort_order, updated_at = now()
			from (values ${sql.join(positions.slice(offset, offset + 1000), sql`, `)}) as position(id, section_id, sort_order)
			where ${links.id} = position.id and ${links.profileId} = ${profileId}::uuid`);
	}
}

export const linksRouter = createTRPCRouter({
	batchEdit: protectedProcedure
		.input(
			z.object({
				selection: z
					.array(
						z.object({
							id: z.string().uuid(),
							updatedAt: z.string().datetime().nullable(),
						}),
					)
					.min(1)
					.max(50)
					.refine((v) => new Set(v.map((l) => l.id)).size === v.length),
				operation: batchOperationSchema,
			}),
		)
		.mutation(async ({ ctx, input }) =>
			db.transaction(async (tx) => {
				const [profile] = await tx
					.select()
					.from(profiles)
					.where(eq(profiles.userId, ctx.userId))
					.for("update");
				if (!profile)
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Profile not found",
					});
				const owned = await tx
					.select()
					.from(links)
					.where(
						and(
							eq(links.profileId, profile.id),
							inArray(
								links.id,
								input.selection.map((l) => l.id),
							),
						),
					)
					.for("update");
				if (owned.length !== input.selection.length)
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "One of these links no longer exists",
					});
				const versions = new Map(
					input.selection.map((l) => [l.id, l.updatedAt]),
				);
				if (
					owned.some(
						(l) => (l.updatedAt?.toISOString() ?? null) !== versions.get(l.id),
					)
				)
					throw new TRPCError({
						code: "CONFLICT",
						message:
							"These links changed. Close this tool, refresh, and review them again.",
					});
				let preview: ReturnType<
					typeof previewBatchLinks<(typeof owned)[number]>
				>;
				try {
					preview = previewBatchLinks(owned, input.operation).filter(
						(l) => l.changed,
					);
				} catch (error) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							error instanceof Error ? error.message : "Invalid batch changes",
					});
				}
				if (input.operation.kind === "duplicate") {
					const positions = await tx
						.select({
							sectionId: links.sectionId,
							max: sql<number>`coalesce(max(${links.sortOrder}), -1)::int`,
						})
						.from(links)
						.where(eq(links.profileId, profile.id))
						.groupBy(links.sectionId);
					const next = new Map(positions.map((p) => [p.sectionId, p.max + 1]));
					await tx.insert(links).values(
						preview.map(({ before: l, patch }) => {
							const sortOrder = next.get(l.sectionId) ?? 0;
							next.set(l.sectionId, sortOrder + 1);
							return {
								profileId: profile.id,
								sectionId: l.sectionId,
								title: patch.title ?? l.title,
								url: l.url,
								description: l.description,
								iconUrl: l.iconUrl,
								iconBgColor: l.iconBgColor,
								featureImageUrl: l.featureImageUrl,
								ctaLabel: l.ctaLabel,
								isActive: false,
								featured: false,
								sortOrder,
							};
						}),
					);
				} else {
					for (const { before, patch } of preview) {
						await tx
							.update(links)
							.set({
								...patch,
								...(patch.url && patch.url !== before.url
									? {
											healthState: null,
											healthStatusCode: null,
											healthFinalUrl: null,
											healthCheckedAt: null,
										}
									: {}),
								updatedAt: new Date(),
							})
							.where(
								and(eq(links.id, before.id), eq(links.profileId, profile.id)),
							);
					}
				}
				return { count: preview.length };
			}),
		),
	importCatalog: protectedProcedure
		.input(z.object({ text: z.string().min(1).max(256_000) }))
		.mutation(async ({ ctx, input }) =>
			db.transaction(async (tx) => {
				const [profile] = await tx
					.select()
					.from(profiles)
					.where(eq(profiles.userId, ctx.userId))
					.for("update");
				if (!profile)
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Profile not found",
					});
				const existing = await tx
					.select({ url: links.url })
					.from(links)
					.where(eq(links.profileId, profile.id));
				let parsed: ReturnType<typeof parseLinkCatalog>;
				try {
					parsed = parseLinkCatalog(
						input.text,
						existing.map((l) => l.url),
					);
				} catch (error) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: error instanceof Error ? error.message : "Invalid catalog",
					});
				}
				if (parsed.links.length) {
					const [position] = await tx
						.select({
							max: sql<number>`coalesce(max(${links.sortOrder}), -1)::int`,
						})
						.from(links)
						.where(
							and(eq(links.profileId, profile.id), isNull(links.sectionId)),
						);
					await tx.insert(links).values(
						parsed.links.map((l, index) => ({
							...l,
							iconBgColor: l.iconBgColor ?? DEFAULT_ICON_BG_COLOR,
							profileId: profile.id,
							isActive: false,
							sortOrder: position.max + index + 1,
						})),
					);
				}
				return { count: parsed.links.length, duplicates: parsed.duplicates };
			}),
		),
	list: protectedProcedure.query(async ({ ctx }) => {
		const profile = await requireProfileByUserId(ctx.userId);
		return fetchProfileLayout({
			profileId: profile.id,
		});
	}),

	importLinks: protectedProcedure
		.input(z.object({ text: z.string().trim().min(1).max(110_000) }))
		.mutation(async ({ ctx, input }) => {
			const profile = await requireProfileByUserId(ctx.userId);
			return db.transaction(async (tx) => {
				// Serialize imports for this profile so two submissions cannot create duplicates.
				await tx
					.select({ id: profiles.id })
					.from(profiles)
					.where(eq(profiles.id, profile.id))
					.for("update");
				const existing = await tx
					.select({ url: links.url })
					.from(links)
					.where(eq(links.profileId, profile.id));
				const parsed = parseLinkImport(
					input.text,
					existing.map((link) => link.url),
				);
				if (parsed.errors.length || parsed.links.length > MAX_IMPORT_LINKS) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: parsed.errors[0]?.message ?? "Too many links",
					});
				}
				if (parsed.links.length === 0)
					return { count: 0, duplicates: parsed.duplicates };
				const [order] = await tx
					.select({
						max: sql<number>`coalesce(max(${links.sortOrder}), -1)::int`,
					})
					.from(links)
					.where(and(eq(links.profileId, profile.id), isNull(links.sectionId)));
				await tx.insert(links).values(
					parsed.links.map((link, index) => ({
						...link,
						profileId: profile.id,
						isActive: false,
						sortOrder: order.max + index + 1,
					})),
				);
				return { count: parsed.links.length, duplicates: parsed.duplicates };
			});
		}),

	add: protectedProcedure
		.input(
			z.object({
				...publishingFields,
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

			const targetSectionId = input.sectionId ?? null;
			assertSchedule(input);
			return db.transaction(async (tx) => {
				await tx
					.select({ id: profiles.id })
					.from(profiles)
					.where(eq(profiles.id, profile.id))
					.for("update");
				if (targetSectionId) {
					const section = await tx.query.linkSections.findFirst({
						where: and(
							eq(linkSections.id, targetSectionId),
							eq(linkSections.profileId, profile.id),
						),
						columns: { id: true },
					});
					if (!section) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: "Section not found",
						});
					}
				}
				const [order] = await tx
					.select({
						max: sql<number>`coalesce(max(${links.sortOrder}), -1)::int`,
					})
					.from(links)
					.where(
						and(
							eq(links.profileId, profile.id),
							targetSectionId
								? eq(links.sectionId, targetSectionId)
								: isNull(links.sectionId),
						),
					);
				const nextSortOrder = order.max + 1;
				if (input.featured)
					await tx
						.update(links)
						.set({ featured: false })
						.where(eq(links.profileId, profile.id));
				const [link] = await tx
					.insert(links)
					.values({
						...input,
						profileId: profile.id,
						sectionId: targetSectionId,
						title: input.title,
						url: input.url,
						description: input.description ?? null,
						iconUrl: input.iconUrl ?? null,
						iconBgColor: input.iconBgColor ?? DEFAULT_ICON_BG_COLOR,
						isActive: input.isActive,
						sortOrder: nextSortOrder,
					})
					.returning();

				return link;
			});
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				...publishingFields,
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

			return db.transaction(async (tx) => {
				await tx
					.select({ id: profiles.id })
					.from(profiles)
					.where(eq(profiles.id, profile.id))
					.for("update");
				const latest = await tx.query.links.findFirst({
					where: and(eq(links.id, input.id), eq(links.profileId, profile.id)),
				});
				if (!latest)
					throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
				assertSchedule({ ...latest, ...input });
				if (input.featured)
					await tx
						.update(links)
						.set({ featured: false })
						.where(eq(links.profileId, profile.id));
				const { id, ...data } = input;
				const [updated] = await tx
					.update(links)
					.set({
						...data,
						...(data.url && data.url !== latest.url
							? {
									healthState: null,
									healthStatusCode: null,
									healthFinalUrl: null,
									healthCheckedAt: null,
								}
							: {}),
						updatedAt: new Date(),
					})
					.where(and(eq(links.id, id), eq(links.profileId, profile.id)))
					.returning();

				if (!updated) {
					throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
				}

				return updated;
			});
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

	bulkAction: protectedProcedure
		.input(
			z.object({
				ids: z.array(z.string().uuid()).min(1).max(200),
				action: z.enum(["publish", "pause", "move", "delete"]),
				sectionId: z.string().uuid().nullable().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const profile = await requireProfileByUserId(ctx.userId);
			const uniqueIds = [...new Set(input.ids)];
			if (uniqueIds.length !== input.ids.length) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Link selection contains duplicate ids",
				});
			}

			await db.transaction(async (tx) => {
				await tx
					.select({ id: profiles.id })
					.from(profiles)
					.where(eq(profiles.id, profile.id))
					.for("update");

				const ownedLinks = await tx
					.select({ id: links.id })
					.from(links)
					.where(
						and(eq(links.profileId, profile.id), inArray(links.id, uniqueIds)),
					);
				if (ownedLinks.length !== uniqueIds.length) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "One or more selected links were not found",
					});
				}

				if (input.action === "delete") {
					await tx
						.delete(links)
						.where(
							and(
								eq(links.profileId, profile.id),
								inArray(links.id, uniqueIds),
							),
						);
					return;
				}

				if (input.action === "publish" || input.action === "pause") {
					await tx
						.update(links)
						.set({
							isActive: input.action === "publish",
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(links.profileId, profile.id),
								inArray(links.id, uniqueIds),
							),
						);
					return;
				}

				const targetSectionId = input.sectionId ?? null;
				if (targetSectionId) {
					const section = await tx.query.linkSections.findFirst({
						where: and(
							eq(linkSections.id, targetSectionId),
							eq(linkSections.profileId, profile.id),
						),
						columns: { id: true },
					});
					if (!section) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: "Destination section not found",
						});
					}
				}

				const [order] = await tx
					.select({
						max: sql<number>`coalesce(max(${links.sortOrder}), -1)::int`,
					})
					.from(links)
					.where(
						and(
							eq(links.profileId, profile.id),
							targetSectionId
								? eq(links.sectionId, targetSectionId)
								: isNull(links.sectionId),
						),
					);
				const nextSortOrder = order.max + 1;

				await applyLinkPositions(
					tx,
					profile.id,
					uniqueIds.map((id, index) => ({
						id,
						sectionId: targetSectionId,
						sortOrder: nextSortOrder + index,
					})),
				);
			});

			return { success: true, count: uniqueIds.length };
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
				if (input.sectionOrderIds.length) {
					const positions = input.sectionOrderIds.map(
						(id, index) => sql`(${id}::uuid, ${index}::int)`,
					);
					await tx.execute(sql`update ${linkSections} set sort_order = position.sort_order, updated_at = now()
						from (values ${sql.join(positions, sql`, `)}) as position(id, sort_order)
						where ${linkSections.id} = position.id and ${linkSections.profileId} = ${profile.id}::uuid`);
				}
				const positions = [
					...input.unsectionedLinkIds.map(
						(id, index) => sql`(${id}::uuid, null::uuid, ${index}::int)`,
					),
					...input.sectionLinkOrders.flatMap((section) =>
						section.linkIds.map(
							(id, index) =>
								sql`(${id}::uuid, ${section.sectionId}::uuid, ${index}::int)`,
						),
					),
				];
				// Chunk parameters to remain below PostgreSQL's bind limit for large profiles.
				for (let offset = 0; offset < positions.length; offset += 1000) {
					await tx.execute(sql`update ${links} set section_id = position.section_id, sort_order = position.sort_order, updated_at = now()
						from (values ${sql.join(positions.slice(offset, offset + 1000), sql`, `)}) as position(id, section_id, sort_order)
						where ${links.id} = position.id and ${links.profileId} = ${profile.id}::uuid`);
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
			const sourceSectionId = input.sourceSectionId ?? null;

			return db.transaction(async (tx) => {
				await tx
					.select({ id: profiles.id })
					.from(profiles)
					.where(eq(profiles.id, profile.id))
					.for("update");
				const layout = await fetchProfileLayout({ profileId: profile.id }, tx);

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

				await applyLinkPositions(tx, profile.id, [
					...remainingLinks.map((link, index) => ({
						id: link.id,
						sectionId: sourceSectionId,
						sortOrder: index,
					})),
					...movedLinks.map((link, index) => ({
						id: link.id,
						sectionId: created.id,
						sortOrder: index,
					})),
				]);

				return created;
			});
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

			await db.transaction(async (tx) => {
				await tx
					.select({ id: profiles.id })
					.from(profiles)
					.where(eq(profiles.id, profile.id))
					.for("update");
				const section = await tx.query.linkSections.findFirst({
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

				const sectionLinks = await tx.query.links.findMany({
					where: and(
						eq(links.profileId, profile.id),
						eq(links.sectionId, input.id),
					),
					columns: { id: true },
					orderBy: [asc(links.sortOrder), asc(links.createdAt), asc(links.id)],
				});
				const unsectionedLinks = await tx.query.links.findMany({
					where: and(eq(links.profileId, profile.id), isNull(links.sectionId)),
					columns: { id: true },
					orderBy: [asc(links.sortOrder), asc(links.createdAt), asc(links.id)],
				});

				await applyLinkPositions(tx, profile.id, [
					...unsectionedLinks.map((link, index) => ({
						id: link.id,
						sectionId: null,
						sortOrder: index,
					})),
					...sectionLinks.map((link, index) => ({
						id: link.id,
						sectionId: null,
						sortOrder: unsectionedLinks.length + index,
					})),
				]);

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
		.input(z.object({ username: z.string().min(1).max(30) }))
		.query(async ({ input }) => {
			const result = await fetchPublicProfileByUsername(input.username);
			if (!result) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Profile not found",
				});
			}
			return result;
		}),
});
