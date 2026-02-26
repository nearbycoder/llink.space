import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/start-server-core";
import { asc, eq } from "drizzle-orm";
import { db } from "#/db";
import { linkSections, links, profiles } from "#/db/schema";
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

	const [profileLinks, profileSections] = await Promise.all([
		db.query.links.findMany({
			where: eq(links.profileId, access.profile.id),
			orderBy: [asc(links.sortOrder), asc(links.createdAt), asc(links.id)],
		}),
		db.query.linkSections.findMany({
			where: eq(linkSections.profileId, access.profile.id),
			orderBy: [
				asc(linkSections.sortOrder),
				asc(linkSections.createdAt),
				asc(linkSections.id),
			],
		}),
	]);

	return {
		status: "ok",
		profile: access.profile,
		links: profileLinks,
		sections: profileSections,
	} as const;
});
