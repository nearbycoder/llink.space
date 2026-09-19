import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "#/lib/auth";
import { isTrustedRequestOrigin } from "#/lib/security";

export interface TRPCContext {
	userId: string | null;
	request: Request;
}

export async function createContext({
	req,
}: {
	req: Request;
}): Promise<TRPCContext> {
	const session = await auth.api.getSession({ headers: req.headers });
	return {
		userId: session?.user?.id ?? null,
		request: req,
	};
}

const t = initTRPC.context<TRPCContext>().create({
	transformer: superjson,
	errorFormatter({ shape, error }) {
		if (error.code !== "INTERNAL_SERVER_ERROR") return shape;
		return {
			...shape,
			message: "Something went wrong. Please try again.",
			data: {
				code: shape.data.code,
				httpStatus: shape.data.httpStatus,
				path: shape.data.path,
			},
		};
	},
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.userId) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}
	if (!isTrustedRequestOrigin(ctx.request)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Invalid request origin",
		});
	}
	return next({ ctx: { ...ctx, userId: ctx.userId } });
});
