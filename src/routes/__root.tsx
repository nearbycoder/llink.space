import {
	HeadContent,
	Scripts,
	createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { useEffect, useState } from "react";

import TanStackQueryProvider from "../integrations/tanstack-query/root-provider";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import PostHogProvider from "../integrations/posthog/provider";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";
import type { TRPCRouter } from "#/integrations/trpc/router";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";

const isProduction = process.env.NODE_ENV === "production";

interface MyRouterContext {
	queryClient: QueryClient;
	trpc: TRPCOptionsProxy<TRPCRouter>;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "llink.space — Your link in bio" },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
			{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
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
				href: "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Work+Sans:wght@400;500;600;700&display=swap",
			},
		],
	}),
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
				"img-src 'self' data: blob: https:",
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
				<TanStackQueryProvider>
					<PostHogProvider>
						{children}
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
		<div className="kinetic-gradient min-h-screen flex items-center justify-center px-4">
			<div className="kinetic-shell max-w-md p-8 text-center">
				<h1
					className="text-4xl text-[#11110F]"
					style={{ fontFamily: "'Archivo Black', sans-serif" }}
				>
					Page not found
				</h1>
				<p className="mt-3 text-sm text-[#4B4B45]">
					The page you requested does not exist.
				</p>
				<a
					href="/"
					className="mt-5 inline-flex rounded-xl border-2 border-black bg-[#11110F] px-4 py-2 text-sm font-semibold text-[#F5FF7B] shadow-[3px_3px_0_0_#11110F] transition-transform hover:-translate-y-0.5"
				>
					Go home
				</a>
			</div>
		</div>
	);
}
