import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchStreamLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type { ReactNode } from "react";
import superjson from "superjson";
import { TRPCProvider } from "#/integrations/trpc/react";
import type { TRPCRouter } from "#/integrations/trpc/router";

function getUrl() {
	const base = (() => {
		if (typeof window !== "undefined") return "";
		const configuredOrigin =
			process.env.APP_URL ??
			process.env.PUBLIC_URL ??
			process.env.BETTER_AUTH_URL ??
			process.env.BETTER_AUTH_BASE_URL;

		if (configuredOrigin) {
			try {
				return new URL(configuredOrigin).origin;
			} catch {
				// Fall through to the local development origin.
			}
		}

		return `http://127.0.0.1:${process.env.PORT ?? 3000}`;
	})();
	return `${base}/api/trpc`;
}

export const trpcClient = createTRPCClient<TRPCRouter>({
	links: [
		httpBatchStreamLink({
			transformer: superjson,
			url: getUrl(),
		}),
	],
});

type RouterContext = {
	queryClient: QueryClient;
	trpc: ReturnType<typeof createTRPCOptionsProxy<TRPCRouter>>;
};

let browserContext: RouterContext | undefined;

function createContext(): RouterContext {
	const queryClient = new QueryClient({
		defaultOptions: {
			dehydrate: { serializeData: superjson.serialize },
			hydrate: { deserializeData: superjson.deserialize },
		},
	});

	const trpc = createTRPCOptionsProxy({
		client: trpcClient,
		queryClient,
	});

	return { queryClient, trpc };
}

export function getContext() {
	// Avoid sharing QueryClient cache across SSR requests.
	if (typeof window === "undefined") {
		return createContext();
	}

	if (!browserContext) {
		browserContext = createContext();
	}

	return browserContext;
}

export default function TanStackQueryProvider({
	children,
}: {
	children: ReactNode;
}) {
	const { queryClient } = getContext();

	return (
		<QueryClientProvider client={queryClient}>
			<TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
				{children}
			</TRPCProvider>
		</QueryClientProvider>
	);
}
