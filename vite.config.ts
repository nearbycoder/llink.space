import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import tsconfigPaths from "vite-tsconfig-paths"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"

import { tanstackStart } from "@tanstack/react-start/plugin/vite"

import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(__dirname, "src")
const tanstackVirtualIds = [
	"#tanstack-router-entry",
	"#tanstack-start-entry",
	"tanstack-start-manifest:v",
	"tanstack-start-injected-head-scripts:v",
]
const tanstackOptimizeDepsExcludes = [
	"@tanstack/start-server-core",
	"@tanstack/start-client-core",
	...tanstackVirtualIds,
]

// Resolve #/ subpath imports to src/
const hashAliasPlugin = {
	name: "hash-alias-plugin",
	resolveId(id: string) {
		if (id.startsWith("#/")) {
			const rel = id.slice(2)
			const base = path.join(srcDir, rel)
			for (const ext of [".tsx", ".ts", ".jsx", ".js", ""]) {
				const candidate = base + ext
				if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
					return candidate
				}
				// Also try /index.tsx etc
				const indexCandidate = path.join(base, "index" + ext)
				if (
					ext &&
					fs.existsSync(indexCandidate) &&
					fs.statSync(indexCandidate).isFile()
				) {
					return indexCandidate
				}
			}
			return base // Let Vite handle it normally if not found
		}
		return undefined
	},
}

const config = defineConfig({
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
		devtools(),
		hashAliasPlugin,
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
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
})

export default config
