import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { useEffect, useState } from "react";
import { SiteBrand } from "#/components/SiteBrand";
import { Toaster } from "#/components/ui/sonner";
import type { TRPCRouter } from "#/integrations/trpc/router";
import { toAbsoluteUrl } from "#/lib/site-url";
import PostHogProvider from "../integrations/posthog/provider";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import TanStackQueryProvider from "../integrations/tanstack-query/root-provider";
import appCss from "../styles.css?url";

const isProduction = process.env.NODE_ENV === "production";

interface MyRouterContext {
	queryClient: QueryClient;
	trpc: TRPCOptionsProxy<TRPCRouter>;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => {
		const defaultDescription =
			"Create one branded link-in-bio page, share it everywhere, and track clicks from one simple dashboard.";
		const defaultOgImage = toAbsoluteUrl("/api/og");

		return {
			meta: [
				{ charSet: "utf-8" },
				{ name: "viewport", content: "width=device-width, initial-scale=1" },
				{ title: "llink.space — Your link in bio" },
				{ name: "description", content: defaultDescription },
				{
					name: "robots",
					content: "index, follow, max-image-preview:large, max-snippet:-1",
				},
				{ name: "theme-color", content: "#F5F3EE" },
				{ property: "og:site_name", content: "llink.space" },
				{ property: "og:image", content: defaultOgImage },
				{ property: "og:image:width", content: "1200" },
				{ property: "og:image:height", content: "630" },
				{ name: "twitter:card", content: "summary_large_image" },
				{ name: "twitter:image", content: defaultOgImage },
			],
			links: [
				{ rel: "stylesheet", href: appCss },
				{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
				{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
				{ rel: "manifest", href: "/site.webmanifest" },
				{ rel: "sitemap", type: "application/xml", href: "/sitemap.xml" },
				{
					rel: "preconnect",
					href: "https://fonts.googleapis.com",
				},
				{
					rel: "preconnect",
					href: "https://fonts.gstatic.com",
					crossOrigin: "anonymous",
				},
				{
					rel: "stylesheet",
					href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600&family=Geist+Mono:wght@400..600&family=Geist:wght@400..700&display=swap",
				},
			],
		};
	},
	headers: () => {
		const headers: Record<string, string> = {
			"x-content-type-options": "nosniff",
			"x-frame-options": "DENY",
			"referrer-policy": "strict-origin-when-cross-origin",
			"permissions-policy": "camera=(), microphone=(), geolocation=()",
			"cross-origin-opener-policy": "same-origin",
			"cross-origin-resource-policy": "same-origin",
		};

		if (isProduction) {
			headers["strict-transport-security"] =
				"max-age=63072000; includeSubDomains; preload";
			headers["content-security-policy"] = [
				"default-src 'self'",
				"base-uri 'self'",
				"frame-ancestors 'none'",
				"form-action 'self'",
				"object-src 'none'",
				"frame-src https://www.youtube-nocookie.com https://player.vimeo.com",
				"img-src 'self' data: blob: https:",
				"media-src 'self' https:",
				"font-src 'self' data: https://fonts.gstatic.com",
				"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
				"script-src 'self' 'unsafe-inline' https://tic.nrby.xyz",
				"connect-src 'self' https: wss:",
				"upgrade-insecure-requests",
			].join("; ");
		}

		return headers;
	},
	shellComponent: RootDocument,
	notFoundComponent: RootNotFound,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
				<script
					defer
					data-domain="llink.space"
					src="https://tic.nrby.xyz/js/script.js"
				/>
			</head>
			<body>
				<a href="#main-content" className="skip-link">
					Skip to content
				</a>
				<TanStackQueryProvider>
					<PostHogProvider>
						<div id="main-content">{children}</div>
						<Toaster position="top-center" richColors closeButton />
						<ClientOnly>
							<TanStackDevtools
								config={{ position: "bottom-right" }}
								plugins={[
									{
										name: "Tanstack Router",
										render: <TanStackRouterDevtoolsPanel />,
									},
									TanStackQueryDevtools,
								]}
							/>
						</ClientOnly>
					</PostHogProvider>
				</TanStackQueryProvider>
				<Scripts />
			</body>
		</html>
	);
}

function ClientOnly({ children }: { children: React.ReactNode }) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return null;
	return <>{children}</>;
}

function RootNotFound() {
	return (
		<div className="auth-workspace flex min-h-screen flex-col px-5 py-6">
			<a href="/" className="w-fit" aria-label="llink.space home">
				<SiteBrand size="md" />
			</a>
			<div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-16">
				<p className="eyebrow">Error 404</p>
				<h1 className="font-display mt-3 text-5xl font-semibold leading-[1.02] sm:text-6xl">
					This page drifted <em className="text-signal-strong">off the map.</em>
				</h1>
				<p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
					The address may be mistyped, or the page may have moved. Head back
					home and start again.
				</p>
				<div className="mt-8 flex flex-wrap gap-3">
					<a
						href="/"
						className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/85"
					>
						Go home
					</a>
					<a
						href="/sign-up"
						className="inline-flex h-11 items-center rounded-full border border-border-strong bg-card px-5 text-sm font-semibold transition-colors hover:bg-accent"
					>
						Create your page
					</a>
				</div>
			</div>
		</div>
	);
}
