import { createHash, randomBytes, randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { emailConnections, profiles, subscribers } from "#/db/schema";
import { clickClientKey, hashClickKey } from "#/lib/click-protection";
import {
	cleanupClickGuards,
	consumeClickBudget,
} from "#/lib/click-protection-server";
import { csvCell } from "#/lib/dashboard-tools";
import {
	removeEmailContact,
	syncEmailContact,
	verifyEmailProvider,
} from "#/lib/email-provider";
import {
	decryptCredential,
	encryptCredential,
} from "#/lib/provider-credentials";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

async function owner(userId: string) {
	const p = await db.query.profiles.findFirst({
		where: eq(profiles.userId, userId),
	});
	if (!p) throw new TRPCError({ code: "NOT_FOUND" });
	return p;
}
const tokenHash = (token: string) =>
	createHash("sha256").update(token).digest("hex");
export const audienceRouter = createTRPCRouter({
	list: protectedProcedure
		.input(
			z
				.object({ page: z.number().int().min(0).default(0) })
				.default({ page: 0 }),
		)
		.query(async ({ ctx, input }) => {
			const p = await owner(ctx.userId);
			const [rows, counts, connection] = await Promise.all([
				db
					.select({
						id: subscribers.id,
						email: subscribers.email,
						name: subscribers.name,
						consentAt: subscribers.consentAt,
						unsubscribedAt: subscribers.unsubscribedAt,
						syncedAt: subscribers.syncedAt,
						providerRemovedAt: subscribers.providerRemovedAt,
					})
					.from(subscribers)
					.where(eq(subscribers.profileId, p.id))
					.orderBy(desc(subscribers.consentAt), desc(subscribers.id))
					.limit(50)
					.offset(input.page * 50),
				db
					.select({
						total: sql<number>`count(*)::int`,
						active: sql<number>`count(*) filter (where ${subscribers.unsubscribedAt} is null)::int`,
					})
					.from(subscribers)
					.where(eq(subscribers.profileId, p.id)),
				db.query.emailConnections.findFirst({
					where: eq(emailConnections.profileId, p.id),
					columns: { listId: true },
				}),
			]);
			return {
				rows,
				...counts[0],
				signupEnabled: p.signupEnabled,
				signupTitle: p.signupTitle,
				connected: Boolean(connection),
				listId: connection?.listId ?? null,
			};
		}),
	settings: protectedProcedure
		.input(
			z.object({
				enabled: z.boolean(),
				title: z.string().trim().min(1).max(80),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const p = await owner(ctx.userId);
			await db
				.update(profiles)
				.set({
					signupEnabled: input.enabled,
					signupTitle: input.title,
					updatedAt: new Date(),
				})
				.where(eq(profiles.id, p.id));
			return { success: true };
		}),
	subscribe: publicProcedure
		.input(
			z.object({
				profileId: z.string().uuid(),
				email: z
					.email()
					.max(254)
					.transform((v) => v.toLowerCase()),
				name: z.string().trim().max(100).default(""),
				consent: z.literal(true),
				restoreToken: z
					.string()
					.regex(/^[\w-]{43}$/)
					.optional(),
				website: z.string().max(200).default(""),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const token = randomBytes(32).toString("base64url");
			const generic = { success: true, token };
			if (input.website) return generic;
			const p = await db.query.profiles.findFirst({
				where: and(
					eq(profiles.id, input.profileId),
					eq(profiles.signupEnabled, true),
				),
			});
			if (!p)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Signups are closed",
				});
			const secret = process.env.BETTER_AUTH_SECRET ?? "local";
			const trusted =
				process.env.ANALYTICS_TRUSTED_IP_HEADER ??
				(process.env.RAILWAY_ENVIRONMENT_ID ? "x-real-ip" : undefined);
			await cleanupClickGuards(db);
			if (
				!(await consumeClickBudget(
					db,
					hashClickKey(secret, [
						"signup",
						p.id,
						clickClientKey(ctx.request, secret, trusted),
					]),
					5,
					60,
				))
			)
				throw new TRPCError({
					code: "TOO_MANY_REQUESTS",
					message: "Please wait a minute before trying again",
				});
			await db.transaction(async (tx) => {
				await tx
					.select({ id: profiles.id })
					.from(profiles)
					.where(eq(profiles.id, p.id))
					.for("update");
				const [count] = await tx
					.select({ total: sql<number>`count(*)::int` })
					.from(subscribers)
					.where(eq(subscribers.profileId, p.id));
				if (count.total >= 10000)
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "This signup list is currently full",
					});
				await tx
					.insert(subscribers)
					.values({
						profileId: p.id,
						email: input.email,
						name: input.name,
						consentText: `I agree to receive email updates from ${p.displayName || p.username}. I can unsubscribe at any time.`,
						unsubscribeHash: tokenHash(token),
					})
					.onConflictDoUpdate({
						target: [subscribers.profileId, subscribers.email],
						set: {
							unsubscribedAt: null,
							syncedAt: null,
							providerRemovedAt: null,
							consentAt: new Date(),
							unsubscribeHash: tokenHash(token),
						},
						setWhere: and(
							isNotNull(subscribers.unsubscribedAt),
							eq(
								subscribers.unsubscribeHash,
								tokenHash(input.restoreToken ?? ""),
							),
						),
					});
			});
			return generic;
		}),

	unsubscribe: publicProcedure
		.input(z.object({ token: z.string().regex(/^[\w-]{43}$/) }))
		.mutation(async ({ input }) => {
			const [row] = await db
				.update(subscribers)
				.set({ unsubscribedAt: new Date() })
				.where(eq(subscribers.unsubscribeHash, tokenHash(input.token)))
				.returning();
			if (row) {
				const c = await db.query.emailConnections.findFirst({
					where: eq(emailConnections.profileId, row.profileId),
				});
				if (c) {
					try {
						await removeEmailContact(
							decryptCredential(c.encryptedKey, row.profileId),
							c.listId,
							row.email,
						);
						await db
							.update(subscribers)
							.set({ providerRemovedAt: new Date() })
							.where(eq(subscribers.id, row.id));
					} catch {
						/* Pending removals are retried by sync. */
					}
				}
			}
			return { success: true };
		}),
	remove: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const p = await owner(ctx.userId);
			await db.transaction(async (tx) => {
				const [row] = await tx
					.select()
					.from(subscribers)
					.where(
						and(eq(subscribers.profileId, p.id), eq(subscribers.id, input.id)),
					)
					.for("update");
				if (!row) return;
				const [c] = await tx
					.select()
					.from(emailConnections)
					.where(eq(emailConnections.profileId, p.id))
					.for("update");
				if (c && row.syncedAt && !row.providerRemovedAt) {
					try {
						await removeEmailContact(
							decryptCredential(c.encryptedKey, p.id),
							c.listId,
							row.email,
						);
					} catch {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message:
								"Could not remove this contact from Brevo. Please retry.",
						});
					}
				}
				await tx.delete(subscribers).where(eq(subscribers.id, row.id));
			});
			return { success: true };
		}),
	exportCsv: protectedProcedure.query(async ({ ctx }) => {
		const p = await owner(ctx.userId);
		const rows = await db
			.select()
			.from(subscribers)
			.where(eq(subscribers.profileId, p.id))
			.orderBy(desc(subscribers.consentAt))
			.limit(10000);
		return [
			["Email", "Name", "Consent recorded (UTC)", "Consent text", "Status"],
			...rows.map((r) => [
				r.email,
				r.name,
				r.consentAt.toISOString(),
				r.consentText,
				r.unsubscribedAt ? "Unsubscribed" : "Active",
			]),
		]
			.map((row) => row.map(csvCell).join(","))
			.join("\r\n");
	}),
	connect: protectedProcedure
		.input(
			z.object({
				apiKey: z.string().trim().min(10).max(300),
				listId: z.number().int().positive(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const p = await owner(ctx.userId);
			if (
				!(await consumeClickBudget(
					db,
					hashClickKey(process.env.BETTER_AUTH_SECRET ?? "local", [
						"email-connect",
						p.id,
					]),
					3,
					60,
				))
			)
				throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
			try {
				await verifyEmailProvider(input.apiKey, input.listId);
			} catch {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Could not verify the Brevo key and list. Check both and try again.",
				});
			}
			const encryptedKey = encryptCredential(input.apiKey, p.id);
			await db.transaction(async (tx) => {
				await tx
					.select({ id: profiles.id })
					.from(profiles)
					.where(eq(profiles.id, p.id))
					.for("update");
				const [c] = await tx
					.select()
					.from(emailConnections)
					.where(eq(emailConnections.profileId, p.id))
					.for("update");
				if (c?.leaseUntil && c.leaseUntil > new Date())
					throw new TRPCError({
						code: "CONFLICT",
						message: "Wait for the current sync to finish",
					});
				await tx
					.insert(emailConnections)
					.values({ profileId: p.id, encryptedKey, listId: input.listId })
					.onConflictDoUpdate({
						target: emailConnections.profileId,
						set: {
							encryptedKey,
							listId: input.listId,
							updatedAt: new Date(),
							syncLease: null,
							leaseUntil: null,
						},
					});
				await tx
					.update(subscribers)
					.set({ syncedAt: null })
					.where(eq(subscribers.profileId, p.id));
			});
			return { success: true };
		}),
	disconnect: protectedProcedure.mutation(async ({ ctx }) => {
		const p = await owner(ctx.userId);
		const removed = await db
			.delete(emailConnections)
			.where(
				and(
					eq(emailConnections.profileId, p.id),
					or(
						isNull(emailConnections.leaseUntil),
						lt(emailConnections.leaseUntil, new Date()),
					),
				),
			)
			.returning();
		if (!removed.length) {
			const c = await db.query.emailConnections.findFirst({
				where: eq(emailConnections.profileId, p.id),
			});
			if (c)
				throw new TRPCError({
					code: "CONFLICT",
					message: "Wait for the current sync to finish",
				});
		}
		return { success: true };
	}),
	sync: protectedProcedure.mutation(async ({ ctx }) => {
		const p = await owner(ctx.userId),
			lease = randomUUID();
		const [connection] = await db
			.update(emailConnections)
			.set({ syncLease: lease, leaseUntil: new Date(Date.now() + 300000) })
			.where(
				and(
					eq(emailConnections.profileId, p.id),
					or(
						isNull(emailConnections.leaseUntil),
						lt(emailConnections.leaseUntil, new Date()),
					),
				),
			)
			.returning();
		if (!connection)
			throw new TRPCError({
				code: "CONFLICT",
				message: "Connect Brevo first, or wait for the current sync to finish",
			});
		let synced = 0,
			failed = 0;
		try {
			const key = decryptCredential(connection.encryptedKey, p.id);

			const rows = await db.query.subscribers.findMany({
				where: and(
					eq(subscribers.profileId, p.id),
					or(
						and(
							isNull(subscribers.unsubscribedAt),
							isNull(subscribers.syncedAt),
						),
						and(
							isNotNull(subscribers.unsubscribedAt),
							isNull(subscribers.providerRemovedAt),
						),
					),
				),
				limit: 20,
				orderBy: desc(subscribers.consentAt),
			});
			for (const row of rows) {
				try {
					await db.transaction(async (tx) => {
						const [current] = await tx
							.select()
							.from(subscribers)
							.where(
								and(
									eq(subscribers.profileId, p.id),
									eq(subscribers.id, row.id),
								),
							)
							.for("update");
						if (!current) return;
						if (current.unsubscribedAt) {
							await removeEmailContact(key, connection.listId, current.email);
							await tx
								.update(subscribers)
								.set({ providerRemovedAt: new Date() })
								.where(eq(subscribers.id, current.id));
						} else {
							await syncEmailContact(key, connection.listId, current.email);
							await tx
								.update(subscribers)
								.set({ syncedAt: new Date() })
								.where(eq(subscribers.id, current.id));
						}
					});
					synced++;
				} catch {
					failed++;
					break;
				}
			}

			return { synced, failed };
		} finally {
			await db
				.update(emailConnections)
				.set({ syncLease: null, leaseUntil: null })
				.where(
					and(
						eq(emailConnections.profileId, p.id),
						eq(emailConnections.syncLease, lease),
					),
				);
		}
	}),
});
