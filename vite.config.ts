import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const tanstackVirtualIds = [
	"#tanstack-router-entry",
	"#tanstack-start-entry",
	"tanstack-start-manifest:v",
	"tanstack-start-injected-head-scripts:v",
];
const tanstackOptimizeDepsExcludes = [
	"@tanstack/start-server-core",
	"@tanstack/start-client-core",
	...tanstackVirtualIds,
];

const config = defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	ssr: {
		external: ["@resvg/resvg-wasm"],
	},
	optimizeDeps: {
		include: ["qrcode"],
		exclude: tanstackOptimizeDepsExcludes,
	},
	environments: {
		ssr: {
			optimizeDeps: {
				exclude: tanstackOptimizeDepsExcludes,
			},
		},
	},
	plugins: [
		devtools({
			eventBusConfig: {
				port: Number(process.env.TANSTACK_DEVTOOLS_PORT ?? 42071),
			},
		}),
		nitro({
			rollupConfig: { external: [/^@sentry\//, /^@resvg\/resvg-wasm/] },
			// API image URLs must reach Start even when browsers request them as assets.
			routes: { "/api/**": "./server/tanstack-api.ts" },
			routeRules: {
				"/assets/**": {
					headers: {
						"cache-control": "public, max-age=31536000, immutable",
						"x-content-type-options": "nosniff",
					},
				},
				"/fonts/**": {
					headers: {
						"cache-control": "public, max-age=31536000, immutable",
						"x-content-type-options": "nosniff",
					},
				},
				"/demo/**": {
					headers: {
						"cache-control": "public, max-age=86400",
						"x-content-type-options": "nosniff",
					},
				},
				"/uploads/**": {
					headers: {
						"cache-control": "public, max-age=31536000, immutable",
						"x-content-type-options": "nosniff",
						"content-security-policy": "default-src 'none'; sandbox",
						"cross-origin-resource-policy": "same-origin",
					},
				},
			},
		}),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
