import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { db } from "#/db"
import * as authSchema from "#/db/auth-schema"
import { resolveTrustedOrigins } from "#/lib/security"

const isProduction = process.env.NODE_ENV === "production"

export const auth = betterAuth({
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
})
