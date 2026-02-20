import { createFileRoute } from "@tanstack/react-router";
import { getStoredObjectByKey } from "#/lib/object-storage";

const OBJECT_PROXY_BASE_PATH = "/api/storage/";

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
		const storedObject = await getStoredObjectByKey(objectKey);
		if (!storedObject) {
			return new Response("Not Found", {
				status: 404,
				headers: { "cache-control": "public, max-age=60" },
			});
		}

		const headers = new Headers();
		headers.set(
			"content-type",
			storedObject.contentType ?? "application/octet-stream",
		);
		headers.set(
			"cache-control",
			storedObject.cacheControl ?? "public, max-age=31536000, immutable",
		);
		headers.set("x-content-type-options", "nosniff");
		if (storedObject.etag) headers.set("etag", storedObject.etag);
		if (storedObject.lastModified) {
			headers.set("last-modified", storedObject.lastModified.toUTCString());
		}

		const responseBody = new ArrayBuffer(storedObject.body.byteLength);
		new Uint8Array(responseBody).set(storedObject.body);

		return new Response(responseBody, {
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
		},
	},
});
