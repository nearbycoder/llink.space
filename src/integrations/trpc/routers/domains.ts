import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { customDomains, profiles } from "#/db/schema";
import { hashClickKey } from "#/lib/click-protection";
import { consumeClickBudget } from "#/lib/click-protection-server";
import {
	domainProofHost,
	domainProofValue,
	normalizeCustomHostname,
} from "#/lib/custom-domains";
import { checkDomainOwnership } from "#/lib/domain-ownership";
import {
	deleteHostedDomain,
	domainHostingConfigured,
	getHostedDomain,
	hostingReady,
	provisionDomain,
} from "#/lib/domain-provider";
import { getConfiguredSiteOrigin } from "#/lib/site-url";
import { createTRPCRouter, protectedProcedure } from "../init";

async function owner(userId: string) {
	const p = await db.query.profiles.findFirst({
		where: eq(profiles.userId, userId),
	});
	if (!p) throw new TRPCError({ code: "NOT_FOUND" });
	return p;
}
export const domainsRouter = createTRPCRouter({
	current: protectedProcedure.query(async ({ ctx }) => {
		const p = await owner(ctx.userId);
		const domain = await db.query.customDomains.findFirst({
			where: eq(customDomains.profileId, p.id),
		});
		return {
			domain: domain
				? {
						id: domain.id,
						hostname: domain.hostname,
						status: domain.status,
						verifiedAt: domain.verifiedAt,
						proofHost: domainProofHost(domain.hostname),
						proofValue: domainProofValue(domain.token),
						hosting: domain.providerStatus,
					}
				: null,
			hostingConfigured: domainHostingConfigured(),
		};
	}),
	add: protectedProcedure
		.input(z.object({ hostname: z.string().max(253) }))
		.mutation(async ({ ctx, input }) => {
			const p = await owner(ctx.userId);
			const hostname = normalizeCustomHostname(
				input.hostname,
				new URL(getConfiguredSiteOrigin()).hostname,
			);
			if (!hostname)
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Enter a public domain name without a scheme, port, or path",
				});
			const [created] = await db
				.insert(customDomains)
				.values({
					profileId: p.id,
					hostname,
					token: randomBytes(24).toString("hex"),
				})
				.onConflictDoNothing({ target: customDomains.profileId })
				.returning();
			if (!created)
				throw new TRPCError({
					code: "CONFLICT",
					message: "Remove your current domain before adding another",
				});
			return { success: true };
		}),
	verify: protectedProcedure.mutation(async ({ ctx }) => {
		const p = await owner(ctx.userId);
		if (
			!(await consumeClickBudget(
				db,
				hashClickKey(process.env.BETTER_AUTH_SECRET ?? "local", [
					"domain-verify",
					p.id,
				]),
				3,
				60,
			))
		)
			throw new TRPCError({
				code: "TOO_MANY_REQUESTS",
				message: "Please wait a minute before checking again",
			});
		const [domain] = await db
			.update(customDomains)
			.set({ leaseUntil: new Date(Date.now() + 90000) })
			.where(
				and(
					eq(customDomains.profileId, p.id),
					or(
						isNull(customDomains.leaseUntil),
						lt(customDomains.leaseUntil, new Date()),
					),
				),
			)
			.returning();
		if (!domain)
			throw new TRPCError({
				code: "CONFLICT",
				message: "Add a domain first, or wait for the current check",
			});
		try {
			if (!(await checkDomainOwnership(domain.hostname, domain.token))) {
				await db
					.update(customDomains)
					.set({ verifiedAt: null, status: "pending" })
					.where(eq(customDomains.id, domain.id));
				return {
					status: "pending",
					message:
						"Ownership TXT record not found yet. Check the name/value and allow time for DNS propagation.",
				};
			}
			try {
				await db
					.update(customDomains)
					.set({
						verifiedAt: new Date(),
						status: domain.status === "active" ? "active" : "verified",
					})
					.where(eq(customDomains.id, domain.id));
			} catch (error) {
				if (
					error &&
					typeof error === "object" &&
					"cause" in error &&
					(error.cause as { code?: string })?.code === "23505"
				)
					throw new TRPCError({
						code: "CONFLICT",
						message: "This domain is already connected to another page",
					});
				throw error;
			}
			if (!domainHostingConfigured())
				return {
					status: "verified",
					message:
						"Ownership verified. Hosting must be configured by the site operator before the domain can go live.",
				};
			const provisioned = domain.providerId
				? {
						hosted: await getHostedDomain(domain.providerId),
						managed: domain.providerManaged,
					}
				: await provisionDomain(domain.hostname);
			if (provisioned.hosted.domain !== domain.hostname)
				throw new Error("Hosting domain mismatch");
			const status = hostingReady(provisioned.hosted)
				? "active"
				: "dns-pending";
			await db
				.update(customDomains)
				.set({
					providerId: provisioned.hosted.id,
					providerManaged: provisioned.managed,
					providerStatus: provisioned.hosted.status,
					status,
				})
				.where(eq(customDomains.id, domain.id));
			return {
				status,
				message:
					status === "active"
						? "Your custom domain is live."
						: "Add the hosting DNS records below, then check again for DNS and certificate status.",
			};
		} catch (error) {
			if (error instanceof TRPCError) throw error;
			throw new TRPCError({
				code: "BAD_REQUEST",
				message:
					"Hosting verification could not finish. Your domain is saved; retry the check.",
			});
		} finally {
			await db
				.update(customDomains)
				.set({ leaseUntil: null })
				.where(eq(customDomains.id, domain.id));
		}
	}),
	remove: protectedProcedure.mutation(async ({ ctx }) => {
		const p = await owner(ctx.userId);
		const [domain] = await db
			.update(customDomains)
			.set({ leaseUntil: new Date(Date.now() + 90000) })
			.where(
				and(
					eq(customDomains.profileId, p.id),
					or(
						isNull(customDomains.leaseUntil),
						lt(customDomains.leaseUntil, new Date()),
					),
				),
			)
			.returning();
		if (!domain)
			throw new TRPCError({
				code: "CONFLICT",
				message: "Wait for the current domain check to finish",
			});
		try {
			if (domain.providerId && domain.providerManaged)
				await deleteHostedDomain(domain.providerId);
			await db.delete(customDomains).where(eq(customDomains.id, domain.id));
			return { success: true };
		} catch {
			await db
				.update(customDomains)
				.set({ leaseUntil: null })
				.where(eq(customDomains.id, domain.id));
			throw new TRPCError({
				code: "BAD_REQUEST",
				message:
					"Could not remove the hosting domain. Please retry before removing the DNS records.",
			});
		}
	}),
});
