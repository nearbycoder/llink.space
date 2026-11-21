import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import satori from "satori";
import { objectNotModified, objectReadOptions } from "./http-cache";

const require = createRequire(import.meta.url);
let resvgReadyPromise: Promise<void> | null = null;

function ensureResvgWasm() {
	resvgReadyPromise ??= readFile(
		require.resolve("@resvg/resvg-wasm/index_bg.wasm"),
	)
		.then((wasm) => initWasm(wasm))
		.catch((error) => {
			resvgReadyPromise = null;
			throw error;
		});
	return resvgReadyPromise;
}

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const OG_CACHE_HEADERS = {
	"Cache-Control": "public, max-age=300, s-maxage=3600",
	"X-Content-Type-Options": "nosniff",
	"Content-Security-Policy": "default-src 'none'; sandbox",
	"Cross-Origin-Resource-Policy": "cross-origin",
};

export const OG_INK = "#16140F";
export const OG_PAPER = "#F5F3EE";
export const OG_SIGNAL = "#FF5F1F";
export const OG_SIGNAL_STRONG = "#C2410C";
export const OG_MUTED = "#67625A";
export const OG_LINE = "#E3DED3";

type OgFont = {
	name: string;
	data: ArrayBuffer;
	weight: 400 | 500 | 600;
	style: "normal" | "italic";
};

const fontFiles = [
	{ file: "fraunces-600.ttf", name: "Fraunces", weight: 600, style: "normal" },
	{
		file: "fraunces-500-italic.ttf",
		name: "Fraunces",
		weight: 500,
		style: "italic",
	},
	{ file: "geist-400.ttf", name: "Geist", weight: 400, style: "normal" },
	{ file: "geist-600.ttf", name: "Geist", weight: 600, style: "normal" },
	{
		file: "geist-mono-500.ttf",
		name: "Geist Mono",
		weight: 500,
		style: "normal",
	},
] as const;

let fontsPromise: Promise<OgFont[]> | null = null;

/** Bundled OFL fonts, read once from the static asset directory. */
export function loadOgFonts() {
	fontsPromise ??= Promise.all(
		fontFiles.map(async (font) => {
			const buffer = await readFile(
				path.join(
					process.cwd(),
					process.env.NODE_ENV === "production" ? ".output/public" : "public",
					"fonts/og",
					font.file,
				),
			);
			return {
				name: font.name,
				weight: font.weight,
				style: font.style,
				data: buffer.buffer.slice(
					buffer.byteOffset,
					buffer.byteOffset + buffer.byteLength,
				) as ArrayBuffer,
			};
		}),
	).catch((error) => {
		fontsPromise = null;
		throw error;
	});
	return fontsPromise;
}

const MAX_OG_CACHE_ENTRIES = 32;
const ogPngCache = new Map<string, { png: Uint8Array; etag: string }>();

function readCachedOgPng(cacheKey: string) {
	const entry = ogPngCache.get(cacheKey);
	if (!entry) return null;
	// Refresh insertion order for LRU eviction.
	ogPngCache.delete(cacheKey);
	ogPngCache.set(cacheKey, entry);
	return entry;
}

function writeCachedOgPng(
	cacheKey: string,
	value: { png: Uint8Array; etag: string },
) {
	if (ogPngCache.size >= MAX_OG_CACHE_ENTRIES) {
		const oldestKey = ogPngCache.keys().next().value;
		if (oldestKey !== undefined) ogPngCache.delete(oldestKey);
	}
	ogPngCache.set(cacheKey, value);
}

export function hashOgCacheKey(payload: unknown): string {
	return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function ogPngResponse(
	entry: { png: Uint8Array; etag: string },
	request?: Request,
): Response {
	const headers = new Headers(OG_CACHE_HEADERS);
	headers.set("content-type", "image/png");
	headers.set("etag", entry.etag);
	headers.set("content-length", String(entry.png.byteLength));

	if (request) {
		const options = objectReadOptions(request);
		if (objectNotModified(options, entry.etag, null)) {
			headers.delete("content-length");
			return new Response(null, { status: 304, headers });
		}
		if (options.head) {
			return new Response(null, { status: 200, headers });
		}
	}

	return new Response(Buffer.from(entry.png), { status: 200, headers });
}

export function getCachedOgResponse(
	cacheKey: string,
	request?: Request,
): Response | null {
	const cached = readCachedOgPng(cacheKey);
	return cached ? ogPngResponse(cached, request) : null;
}

export async function renderOgImage(
	element: ReactNode,
	options: {
		fonts: OgFont[];
		cacheKey?: string;
		request?: Request;
	},
): Promise<Response> {
	if (options.cacheKey) {
		const cached = readCachedOgPng(options.cacheKey);
		if (cached) return ogPngResponse(cached, options.request);
	}

	const [svg] = await Promise.all([
		satori(element, {
			width: OG_WIDTH,
			height: OG_HEIGHT,
			fonts: options.fonts,
		}),
		ensureResvgWasm(),
	]);
	const png = new Resvg(svg, {
		fitTo: { mode: "width", value: OG_WIDTH },
	})
		.render()
		.asPng();
	const etag = `"${createHash("sha256").update(png).digest("base64url").slice(0, 24)}"`;
	const entry = { png, etag };

	if (options.cacheKey) {
		writeCachedOgPng(options.cacheKey, entry);
	}

	return ogPngResponse(entry, options.request);
}

const MAX_LUCIDE_CACHE_ENTRIES = 512;
const lucideDataUriCache = new Map<string, string>();

export function lucideDataUri(
	Icon: LucideIcon,
	cacheKey: string,
	size: number,
	color: string,
) {
	const key = `${cacheKey}-${size}-${color}`;
	const cached = lucideDataUriCache.get(key);
	if (cached) return cached;
	const svg = renderToStaticMarkup(
		<Icon size={size} color={color} strokeWidth={2.2} />,
	);
	const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
	if (lucideDataUriCache.size >= MAX_LUCIDE_CACHE_ENTRIES) {
		const oldestKey = lucideDataUriCache.keys().next().value;
		if (oldestKey !== undefined) lucideDataUriCache.delete(oldestKey);
	}
	lucideDataUriCache.set(key, uri);
	return uri;
}

/** The "ll·" mark built from boxes so Satori renders it without an SVG asset. */
export function OgBrandMark({
	size = 48,
	tile = OG_INK,
}: {
	size?: number;
	tile?: string;
}) {
	const unit = size / 32;
	return (
		<div
			style={{
				display: "flex",
				position: "relative",
				width: size,
				height: size,
				borderRadius: 9 * unit,
				background: tile,
			}}
		>
			{[8.5, 15].map((x) => (
				<div
					key={x}
					style={{
						position: "absolute",
						left: x * unit,
						top: 7 * unit,
						width: 4 * unit,
						height: 18 * unit,
						borderRadius: 2 * unit,
						background: "#FAF8F3",
					}}
				/>
			))}
			<div
				style={{
					position: "absolute",
					left: 20.75 * unit,
					top: 19.75 * unit,
					width: 5.5 * unit,
					height: 5.5 * unit,
					borderRadius: 999,
					background: OG_SIGNAL,
				}}
			/>
		</div>
	);
}

export function OgWordmark({
	size = 40,
	color = OG_INK,
}: {
	size?: number;
	color?: string;
}) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: size * 0.3 }}>
			<OgBrandMark size={size} />
			<div
				style={{
					fontFamily: "Fraunces",
					fontWeight: 600,
					fontSize: size * 0.82,
					letterSpacing: "-0.03em",
					color,
				}}
			>
				llink.space
			</div>
		</div>
	);
}

export function clampText(value: string, maxLength: number) {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength - 1)}…`;
}
