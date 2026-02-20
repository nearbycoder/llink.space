import { createFileRoute } from "@tanstack/react-router";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "#/integrations/trpc/init";
import { trpcRouter } from "#/integrations/trpc/router";
import { isTrustedRequestOrigin } from "#/lib/security";

async function handler({ request }: { request: Request }) {
	if (request.method === "POST" && !isTrustedRequestOrigin(request)) {
		return new Response(JSON.stringify({ error: "Invalid request origin" }), {
			status: 403,
			headers: {
				"content-type": "application/json",
				"cache-control": "no-store",
			},
		});
	}

	const response = await fetchRequestHandler({
		req: request,
		router: trpcRouter,
		endpoint: "/api/trpc",
		createContext: ({ req }) => createContext({ req }),
	});

	const headers = new Headers(response.headers);
	headers.set("cache-control", "no-store");

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

export const Route = createFileRoute("/api/trpc/$")({
	server: {
		handlers: {
			GET: handler,
			POST: handler,
		},
	},
});
