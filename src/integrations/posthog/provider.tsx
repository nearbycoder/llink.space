import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

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
		let cancelled = false;
		if (initializedRef.current) return;
		if (!import.meta.env.VITE_POSTHOG_KEY) return;

		// Avoid local-dev hydration noise and third-party script issues by default.
		const allowInDev = import.meta.env.VITE_POSTHOG_DEV_ENABLED === "true";
		if (import.meta.env.DEV && !allowInDev) return;

		void import("posthog-js")
			.then(({ default: posthog }) => {
				if (cancelled) return;
				posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
					api_host: normalizePosthogHost(import.meta.env.VITE_POSTHOG_HOST),
					person_profiles: "identified_only",
					capture_pageview: false,
					defaults: "2025-11-30",
				});
				initializedRef.current = true;
			})
			.catch(() => {
				/* Optional telemetry must not interrupt the app. */
			});
		return () => {
			cancelled = true;
		};
	}, []);

	return <>{children}</>;
}
