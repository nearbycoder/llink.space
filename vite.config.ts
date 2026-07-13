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
	optimizeDeps: {
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
			rollupConfig: { external: [/^@sentry\//] },
			routeRules: {
				"/uploads/**": {
					headers: {
						"cache-control": "public, max-age=31536000, immutable",
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
