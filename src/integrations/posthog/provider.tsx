import posthog from "posthog-js";
import { PostHogProvider as BasePostHogProvider } from "@posthog/react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

function normalizePosthogHost(rawHost?: string) {
	const fallback = "https://us.i.posthog.com";
	if (!rawHost) return fallback;

	const host = rawHost.trim().replace(/\/+$/, "");
	// Asset domains are script CDNs, not API hosts.
	if (host.includes("assets.i.posthog.com")) {
		return fallback;
	}
	return host;
}

interface PostHogProviderProps {
	children: ReactNode;
}

export default function PostHogProvider({ children }: PostHogProviderProps) {
	const initializedRef = useRef(false);

	useEffect(() => {
		if (initializedRef.current) return;
		if (!import.meta.env.VITE_POSTHOG_KEY) return;

		// Avoid local-dev hydration noise and third-party script issues by default.
		const allowInDev = import.meta.env.VITE_POSTHOG_DEV_ENABLED === "true";
		if (import.meta.env.DEV && !allowInDev) return;

		posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
			api_host: normalizePosthogHost(import.meta.env.VITE_POSTHOG_HOST),
			person_profiles: "identified_only",
			capture_pageview: false,
			defaults: "2025-11-30",
		});
		initializedRef.current = true;
	}, []);

	return <BasePostHogProvider client={posthog}>{children}</BasePostHogProvider>;
}
