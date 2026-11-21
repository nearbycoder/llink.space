import { and, asc, eq } from "drizzle-orm";
import { db } from "#/db";
import { customDomains, linkSections, links, profiles } from "#/db/schema";
import { publishedLinkFilter } from "./link-publishing-server";
import { normalizeObjectUrlForClient } from "./object-storage";

export const publicProfileColumns = {
	id: profiles.id,
	username: profiles.username,
	displayName: profiles.displayName,
	bio: profiles.bio,
	theme: profiles.theme,
	fontFamily: profiles.fontFamily,
	buttonStyle: profiles.buttonStyle,
	accentColor: profiles.accentColor,
	contentBlocks: profiles.contentBlocks,
	pageBackgroundType: profiles.pageBackgroundType,
	pageBackgroundColor: profiles.pageBackgroundColor,
	pageBackgroundGradient: profiles.pageBackgroundGradient,
	signupEnabled: profiles.signupEnabled,
	signupTitle: profiles.signupTitle,
	avatarUrl: profiles.avatarUrl,
	pageBackgroundImageUrl: profiles.pageBackgroundImageUrl,
} as const;

type PublicProfileRow = {
	id: string;
	username: string;
	displayName: string | null;
	bio: string | null;
	theme: string | null;
	fontFamily: string;
	buttonStyle: string;
	accentColor: string | null;
	contentBlocks: typeof profiles.$inferSelect.contentBlocks;
	pageBackgroundType: string;
	pageBackgroundColor: string;
	pageBackgroundGradient: string;
	signupEnabled: boolean;
	signupTitle: string;
	avatarUrl: string | null;
	pageBackgroundImageUrl: string | null;
};

export async function fetchPublicProfileForRow(
	profile: PublicProfileRow,
	knownCustomDomain?: string | null,
) {
	const [profileLinks, profileSections, domainRow] = await Promise.all([
		db
			.select({
				id: links.id,
				title: links.title,
				url: links.url,
				description: links.description,
				iconUrl: links.iconUrl,
				iconBgColor: links.iconBgColor,
				sectionId: links.sectionId,
				featured: links.featured,
				featureImageUrl: links.featureImageUrl,
				ctaLabel: links.ctaLabel,
				sortOrder: links.sortOrder,
				createdAt: links.createdAt,
			})
			.from(links)
			.where(and(eq(links.profileId, profile.id), publishedLinkFilter()))
			.orderBy(asc(links.sortOrder), asc(links.createdAt), asc(links.id)),
		db
			.select({
				id: linkSections.id,
				title: linkSections.title,
				sortOrder: linkSections.sortOrder,
				createdAt: linkSections.createdAt,
			})
			.from(linkSections)
			.where(eq(linkSections.profileId, profile.id))
			.orderBy(
				asc(linkSections.sortOrder),
				asc(linkSections.createdAt),
				asc(linkSections.id),
			),
		knownCustomDomain !== undefined
			? Promise.resolve(null)
			: db.query.customDomains.findFirst({
					where: and(
						eq(customDomains.profileId, profile.id),
						eq(customDomains.status, "active"),
					),
					columns: { hostname: true },
				}),
	]);

	const sectionOrder = new Map(
		profileSections.map((section, index) => [section.id, index]),
	);
	const fallbackSectionOrder = profileSections.length + 1;
	const sortedLinks = [...profileLinks].sort((a, b) => {
		const aSection =
			a.sectionId === null
				? -1
				: (sectionOrder.get(a.sectionId) ?? fallbackSectionOrder);
		const bSection =
			b.sectionId === null
				? -1
				: (sectionOrder.get(b.sectionId) ?? fallbackSectionOrder);
		if (aSection !== bSection) return aSection - bSection;
		const sortOrderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
		if (sortOrderDiff !== 0) return sortOrderDiff;
		const createdDiff =
			(a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
		if (createdDiff !== 0) return createdDiff;
		return a.id.localeCompare(b.id);
	});

	// Explicit public fields keep account IDs, timestamps, and diagnostic URLs private.
	const publicLinks = sortedLinks.map((link) => ({
		id: link.id,
		title: link.title,
		url: link.url,
		description: link.description,
		iconUrl: link.iconUrl,
		iconBgColor: link.iconBgColor,
		sectionId: link.sectionId,
		featured: link.featured,
		featureImageUrl: link.featureImageUrl,
		ctaLabel: link.ctaLabel,
	}));

	const linksBySection = new Map<string | null, typeof publicLinks>();
	for (const link of publicLinks) {
		const bucket = linksBySection.get(link.sectionId);
		if (bucket) bucket.push(link);
		else linksBySection.set(link.sectionId, [link]);
	}

	const sections = profileSections
		.map((section) => ({
			id: section.id,
			title: section.title,
			links: linksBySection.get(section.id) ?? [],
		}))
		.filter((section) => section.links.length > 0);

	const unsectionedLinks = linksBySection.get(null) ?? [];

	return {
		customDomain:
			knownCustomDomain !== undefined
				? knownCustomDomain
				: (domainRow?.hostname ?? null),
		profile: {
			id: profile.id,
			username: profile.username,
			displayName: profile.displayName,
			bio: profile.bio,
			theme: profile.theme,
			fontFamily: profile.fontFamily,
			buttonStyle: profile.buttonStyle,
			accentColor: profile.accentColor,
			contentBlocks: profile.contentBlocks,
			pageBackgroundType: profile.pageBackgroundType,
			pageBackgroundColor: profile.pageBackgroundColor,
			pageBackgroundGradient: profile.pageBackgroundGradient,
			signupEnabled: profile.signupEnabled,
			signupTitle: profile.signupTitle,
			avatarUrl: normalizeObjectUrlForClient(profile.avatarUrl),
			pageBackgroundImageUrl: normalizeObjectUrlForClient(
				profile.pageBackgroundImageUrl,
			),
		},
		links: publicLinks,
		sections,
		unsectionedLinks,
	};
}

export async function fetchPublicProfileByUsername(username: string) {
	const [profile] = await db
		.select(publicProfileColumns)
		.from(profiles)
		.where(eq(profiles.username, username.toLowerCase()))
		.limit(1);
	if (!profile) return null;
	return fetchPublicProfileForRow(profile);
}
