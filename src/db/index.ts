import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as authSchema from "./auth-schema.ts";
import * as schema from "./schema.ts";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("DATABASE_URL is not configured");
}

const configuredPoolMax = Number.parseInt(process.env.DB_POOL_MAX ?? "", 10);
const pool = new Pool({
	connectionString: databaseUrl,
	max:
		Number.isFinite(configuredPoolMax) && configuredPoolMax > 0
			? Math.min(configuredPoolMax, 100)
			: 20,
	idleTimeoutMillis: 30_000,
	connectionTimeoutMillis: 10_000,
});

export const db = drizzle(pool, {
	schema: { ...schema, ...authSchema },
});
