import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "#/db";
import * as authSchema from "#/db/auth-schema";
import { resolveTrustedOrigins } from "#/lib/security";
import { getConfiguredSiteOrigin } from "#/lib/site-url";

const isProduction = process.env.NODE_ENV === "production";
const authSecret =
	process.env.BETTER_AUTH_SECRET ??
	(isProduction ? undefined : "llink-space-dev-secret-change-me");

if (isProduction && !authSecret) {
	throw new Error("BETTER_AUTH_SECRET must be configured in production");
}

const authBaseUrl =
	process.env.BETTER_AUTH_URL ??
	process.env.BETTER_AUTH_BASE_URL ??
	getConfiguredSiteOrigin();

export const auth = betterAuth({
	secret: authSecret,
	baseURL: authBaseUrl,
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: authSchema,
	}),
	emailAndPassword: {
		enabled: true,
	},
	trustedOrigins: (request) => resolveTrustedOrigins(request),
	rateLimit: {
		enabled: isProduction,
		window: 60,
		max: 120,
	},
	advanced: {
		useSecureCookies: isProduction,
	},
	plugins: [tanstackStartCookies()],
});
