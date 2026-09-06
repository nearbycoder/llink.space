import { createFileRoute } from "@tanstack/react-router";
import { objectReadOptions } from "#/lib/http-cache";
import { getStoredObjectByKey } from "#/lib/object-storage";

const OBJECT_PROXY_BASE_PATH = "/api/storage/";
const SAFE_PROFILE_IMAGE_CONTENT_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
]);

function decodeObjectPath(pathValue: string) {
	try {
		return pathValue
			.split("/")
			.filter(Boolean)
			.map((segment) => decodeURIComponent(segment))
			.join("/");
	} catch {
		return pathValue.replace(/^\/+/, "");
	}
}

function extractObjectKeyFromRequestUrl(requestUrl: string) {
	const { pathname } = new URL(requestUrl);
	if (!pathname.startsWith(OBJECT_PROXY_BASE_PATH)) return null;
	const encodedPath = pathname.slice(OBJECT_PROXY_BASE_PATH.length);
	if (!encodedPath) return null;
	const key = decodeObjectPath(encodedPath);
	if (!key) return null;
	if (key.includes("\u0000")) return null;
	if (key.split("/").some((segment) => segment === "." || segment === "..")) {
		return null;
	}
	return key;
}

async function getObjectHandler({ request }: { request: Request }) {
	const objectKey = extractObjectKeyFromRequestUrl(request.url);
	if (!objectKey) {
		return new Response("Bad Request", {
			status: 400,
			headers: { "cache-control": "no-store" },
		});
	}

	try {
		const storedObject = await getStoredObjectByKey(
			objectKey,
			objectReadOptions(request),
		);
		if (!storedObject) {
			return new Response("Not Found", {
				status: 404,
				headers: { "cache-control": "public, max-age=60" },
			});
		}
		if (storedObject.notModified)
			return new Response(null, {
				status: 304,
				headers: {
					"cache-control":
						storedObject.cacheControl ?? "public, max-age=31536000, immutable",
					...(storedObject.etag ? { etag: storedObject.etag } : {}),
					...(storedObject.lastModified
						? { "last-modified": storedObject.lastModified.toUTCString() }
						: {}),
				},
			});
		if (
			!storedObject.contentType ||
			!SAFE_PROFILE_IMAGE_CONTENT_TYPES.has(
				storedObject.contentType.toLowerCase(),
			)
		) {
			await storedObject.body?.cancel();
			return new Response("Unsupported Media Type", {
				status: 415,
				headers: {
					"cache-control": "no-store",
					"x-content-type-options": "nosniff",
				},
			});
		}

		const headers = new Headers();
		headers.set("content-type", storedObject.contentType);
		headers.set(
			"cache-control",
			storedObject.cacheControl ?? "public, max-age=31536000, immutable",
		);
		headers.set("x-content-type-options", "nosniff");
		headers.set("content-security-policy", "default-src 'none'; sandbox");
		headers.set("cross-origin-resource-policy", "same-origin");
		if (storedObject.etag) headers.set("etag", storedObject.etag);
		if (storedObject.lastModified) {
			headers.set("last-modified", storedObject.lastModified.toUTCString());
		}

		if (storedObject.contentLength !== null)
			headers.set("content-length", String(storedObject.contentLength));

		return new Response(storedObject.body, {
			status: 200,
			headers,
		});
	} catch (error) {
		console.error("Object read failed", error);
		return new Response("Internal Server Error", {
			status: 500,
			headers: { "cache-control": "no-store" },
		});
	}
}

export const Route = createFileRoute("/api/storage/$")({
	server: {
		handlers: {
			GET: getObjectHandler,
			HEAD: getObjectHandler,
		},
	},
});
