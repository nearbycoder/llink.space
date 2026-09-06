import { sql } from "drizzle-orm";
import type { db } from "#/db";
import { analyticsGuards } from "#/db/schema";
import { clickClientKey, hashClickKey } from "./click-protection";

type Executor = Pick<typeof db, "execute">;
const secret = process.env.BETTER_AUTH_SECRET ?? "llink-local-click-protection";
let nextCleanup = 0;
let requestsSinceCleanup = 0;

export function clickGuardKeys(
	request: Request,
	profileId: string,
	linkId: string,
	referrer: string,
) {
	const header =
		process.env.ANALYTICS_TRUSTED_IP_HEADER ??
		(process.env.RAILWAY_ENVIRONMENT_ID ? "x-real-ip" : undefined);
	const client = clickClientKey(request, secret, header);
	return {
		rate: hashClickKey(secret, ["rate", profileId, client]),
		duplicate: hashClickKey(secret, [
			"duplicate",
			profileId,
			linkId,
			client,
			request.headers.get("user-agent")?.slice(0, 512) ?? "",
			referrer,
		]),
	};
}

/** Atomic upsert: expired windows restart; exhausted windows cannot increment. */
export async function consumeClickBudget(
	executor: Executor,
	key: string,
	limit: number,
	seconds: number,
) {
	const result = await executor.execute(sql`
		insert into ${analyticsGuards} (key, count, expires_at)
		values (${key}, 1, now() + ${seconds} * interval '1 second')
		on conflict (key) do update set
			count = case when ${analyticsGuards.expiresAt} <= now() then 1 else ${analyticsGuards.count} + 1 end,
			expires_at = case when ${analyticsGuards.expiresAt} <= now() then excluded.expires_at else ${analyticsGuards.expiresAt} end
		where ${analyticsGuards.expiresAt} <= now() or ${analyticsGuards.count} < ${limit}
		returning key`);
	return result.rows.length > 0;
}

export async function cleanupClickGuards(executor: Executor) {
	requestsSinceCleanup += 1;
	if (requestsSinceCleanup < 32 && Date.now() < nextCleanup) return;
	requestsSinceCleanup = 0;
	nextCleanup = Date.now() + 60_000;
	try {
		await executor.execute(sql`delete from ${analyticsGuards} where key in (
			select key from ${analyticsGuards} where expires_at < now() order by expires_at limit 500
		)`);
	} catch {
		nextCleanup = 0;
	}
}
