import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/start-server-core";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "#/db";
import { customDomains, profiles } from "#/db/schema";
import { trpcRouter } from "#/integrations/trpc/router";
import { checkDomainOwnership } from "./domain-ownership";
import { getConfiguredSiteOrigin } from "./site-url";
export const getCustomDomainPage = createServerFn().handler(async () => {
	const request = getRequest();
	const hostname = new URL(request.url).hostname.toLowerCase();
	if (
		hostname === new URL(getConfiguredSiteOrigin()).hostname ||
		hostname === "localhost" ||
		hostname === "127.0.0.1"
	)
		return null;
	const domain = await db.query.customDomains.findFirst({
		where: and(
			eq(customDomains.hostname, hostname),
			eq(customDomains.status, "active"),
			isNotNull(customDomains.verifiedAt),
		),
	});
	if (!domain) return null;
	// Recheck long-lived mappings so removing an ownership record retires the claim.
	if (
		!domain.verifiedAt ||
		domain.verifiedAt.getTime() < Date.now() - 86400000
	) {
		const valid = await checkDomainOwnership(hostname, domain.token);
		await db
			.update(customDomains)
			.set({
				verifiedAt: valid ? new Date() : null,
				status: valid ? "active" : "pending",
			})
			.where(
				and(
					eq(customDomains.id, domain.id),
					eq(customDomains.token, domain.token),
				),
			);
		if (!valid) return null;
	}
	const profile = await db.query.profiles.findFirst({
		where: eq(profiles.id, domain.profileId),
	});
	if (!profile) return null;
	return trpcRouter
		.createCaller({ request, userId: null })
		.links.getPublic({ username: profile.username });
});
