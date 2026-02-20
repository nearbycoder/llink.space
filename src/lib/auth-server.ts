import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/start-server-core"
import { eq } from "drizzle-orm"
import { auth } from "./auth"
import { db } from "#/db"
import { profiles } from "#/db/schema"

/**
 * Server function that checks whether the current request has a valid session
 * and an existing profile. Returns a discriminated union so the caller can
 * redirect appropriately without any cookie-forwarding plumbing.
 */
export const checkDashboardAccess = createServerFn().handler(async () => {
	const request = getRequest()
	const session = await auth.api.getSession({ headers: request.headers })

	if (!session) {
		return { status: "unauthenticated" } as const
	}

	const profile = await db.query.profiles.findFirst({
		where: eq(profiles.userId, session.user.id),
	})

	if (!profile) {
		return { status: "no-profile" } as const
	}

	return { status: "ok", profile } as const
})
