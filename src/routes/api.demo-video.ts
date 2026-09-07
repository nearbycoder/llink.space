import { createFileRoute } from "@tanstack/react-router";
import { demoVideoResponse } from "#/lib/demo-video.server";

export const Route = createFileRoute("/api/demo-video")({
	server: {
		handlers: {
			GET: ({ request }) => demoVideoResponse(request),
			HEAD: ({ request }) => demoVideoResponse(request),
		},
	},
});
