import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/start-server-core";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { links, profiles } from "#/db/schema";
import { fetchAnalyticsSummary } from "#/integrations/trpc/routers/analytics";
import { fetchAudienceList } from "#/integrations/trpc/routers/audience";
import { fetchCurrentDomain } from "#/integrations/trpc/routers/domains";
import { fetchProfileLayout } from "#/integrations/trpc/routers/links";
import { normalizeObjectUrlForClient } from "#/lib/object-storage";
import { auth } from "./auth";

async function resolveDashboardAccess(headers: Headers) {
	const session = await auth.api.getSession({ headers });

	if (!session) {
		return { status: "unauthenticated" } as const;
	}

	const profile = await db.query.profiles.findFirst({
		where: eq(profiles.userId, session.user.id),
	});

	if (!profile) {
		return { status: "no-profile" } as const;
	}

	return {
		status: "ok",
		profile: {
			...profile,
			avatarUrl: normalizeObjectUrlForClient(profile.avatarUrl),
			pageBackgroundImageUrl: normalizeObjectUrlForClient(
				profile.pageBackgroundImageUrl,
			),
		},
	} as const;
}

/**
 * Server function that checks whether the current request has a valid session
 * and an existing profile. Returns a discriminated union so the caller can
 * redirect appropriately without any cookie-forwarding plumbing.
 */
export const checkDashboardAccess = createServerFn().handler(async () => {
	const request = getRequest();
	return resolveDashboardAccess(request.headers);
});

/**
 * Server function that returns dashboard links for the current user with
 * auth/profile checks performed on the server request context.
 */
export const getDashboardLinks = createServerFn().handler(async () => {
	const request = getRequest();
	const access = await resolveDashboardAccess(request.headers);

	if (access.status !== "ok") {
		return access;
	}

	const layout = await fetchProfileLayout({ profileId: access.profile.id });

	return {
		status: "ok",
		profile: access.profile,
		links: layout.links,
		sections: layout.sections,
	} as const;
});

/**
 * Include analytics in the authenticated route response so a refresh can
 * render real metrics immediately instead of starting with empty cards.
 */
export const getDashboardAnalytics = createServerFn()
	.validator(
		z.object({ days: z.union([z.literal(7), z.literal(30), z.literal(90)]) }),
	)
	.handler(async ({ data }) => {
		const request = getRequest();
		const access = await resolveDashboardAccess(request.headers);

		if (access.status !== "ok") {
			return access;
		}

		return {
			status: "ok",
			summary: await fetchAnalyticsSummary(access.profile.id, data.days),
		} as const;
	});

export const getDashboardDesign = createServerFn().handler(async () => {
	const request = getRequest();
	const access = await resolveDashboardAccess(request.headers);
	if (access.status !== "ok") return access;
	const layout = await fetchProfileLayout({ profileId: access.profile.id });
	return { status: "ok" as const, profile: access.profile, layout };
});

export const getDashboardHealth = createServerFn().handler(async () => {
	const request = getRequest();
	const access = await resolveDashboardAccess(request.headers);
	if (access.status !== "ok") return access;
	const profileLinks = await db.query.links.findMany({
		where: eq(links.profileId, access.profile.id),
		orderBy: [asc(links.sortOrder), asc(links.createdAt), asc(links.id)],
	});
	return { status: "ok" as const, links: profileLinks };
});

export const getDashboardAudience = createServerFn().handler(async () => {
	const request = getRequest();
	const access = await resolveDashboardAccess(request.headers);
	if (access.status !== "ok") return access;
	return {
		status: "ok" as const,
		audience: await fetchAudienceList(access.profile, {
			page: 0,
			search: "",
			status: "all",
		}),
	};
});

export const getDashboardDomain = createServerFn().handler(async () => {
	const request = getRequest();
	const access = await resolveDashboardAccess(request.headers);
	if (access.status !== "ok") return access;
	return {
		status: "ok" as const,
		domain: await fetchCurrentDomain(access.profile.id),
	};
});
