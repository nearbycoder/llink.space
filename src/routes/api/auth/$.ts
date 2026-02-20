import { createFileRoute } from "@tanstack/react-router"
import { auth } from "#/lib/auth"
import { isTrustedRequestOrigin } from "#/lib/security"

async function authHandler(request: Request) {
	if (request.method === "POST" && !isTrustedRequestOrigin(request)) {
		return new Response(JSON.stringify({ error: "Invalid request origin" }), {
			status: 403,
			headers: {
				"content-type": "application/json",
				"cache-control": "no-store",
			},
		})
	}

	const response = await auth.handler(request)
	const headers = new Headers(response.headers)
	headers.set("cache-control", "no-store")

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => authHandler(request),
      POST: ({ request }) => authHandler(request),
    },
  },
})
