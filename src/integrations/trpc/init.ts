import { TRPCError, initTRPC } from "@trpc/server"
import superjson from "superjson"
import { auth } from "#/lib/auth"

export interface TRPCContext {
	userId: string | null
	request: Request
}

export async function createContext({
	req,
}: {
	req: Request
}): Promise<TRPCContext> {
	const session = await auth.api.getSession({ headers: req.headers })
	return {
		userId: session?.user?.id ?? null,
		request: req,
	}
}

const t = initTRPC.context<TRPCContext>().create({
	transformer: superjson,
})

export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.userId) {
		throw new TRPCError({ code: "UNAUTHORIZED" })
	}
	return next({ ctx: { ...ctx, userId: ctx.userId } })
})
