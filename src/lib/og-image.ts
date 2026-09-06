import {
	getStoredObjectByKey,
	normalizeObjectUrlForClient,
} from "./object-storage";
import {
	allowedImageMimeTypes,
	hasExpectedImageSignature,
	MAX_PROFILE_IMAGE_SIZE_BYTES,
} from "./profile-image";
import { readStreamWithLimit } from "./request-body";
import { getConfiguredSiteOrigin } from "./site-url";

/** Resolve upload keys only. Never pass user-supplied URLs to the image renderer. */
export function storedPreviewImageKey(
	value: string | null | undefined,
): string | null {
	if (!value) return null;
	const normalized = normalizeObjectUrlForClient(value);
	if (!normalized || normalized.startsWith("//")) return null;
	try {
		const origin = getConfiguredSiteOrigin();
		const url = new URL(normalized, origin);
		if (url.origin !== new URL(origin).origin || url.username || url.password)
			return null;
		const bases = [
			process.env.LOCAL_OBJECT_STORAGE_BASE_PATH ?? "/uploads",
			process.env.OBJECT_STORAGE_PROXY_BASE_PATH ?? "/api/storage",
		];
		const base = bases
			.map((path) => `${path.replace(/\/+$/, "")}/`)
			.find((path) => url.pathname.startsWith(path));
		if (!base) return null;
		const key = decodeURIComponent(url.pathname.slice(base.length));
		const prefix = (
			process.env.S3_KEY_PREFIX ??
			process.env.OBJECT_STORAGE_KEY_PREFIX ??
			""
		).replace(/^\/+|\/+$/g, "");
		const uploadKey =
			prefix && key.startsWith(`${prefix}/`)
				? key.slice(prefix.length + 1)
				: key;
		if (
			!/^(avatars|backgrounds)\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/i.test(
				uploadKey,
			)
		)
			return null;
		return key;
	} catch {
		return null;
	}
}

export async function storedPreviewImage(
	value: string | null | undefined,
): Promise<string | null> {
	const key = storedPreviewImageKey(value);
	if (!key) return null;
	try {
		const object = await getStoredObjectByKey(key, {
			signal: AbortSignal.timeout(5000),
		});
		if (!object?.body) return null;
		const type = object.contentType?.toLowerCase() ?? "";
		if (
			!allowedImageMimeTypes.has(type) ||
			(object.contentLength ?? 0) > MAX_PROFILE_IMAGE_SIZE_BYTES
		) {
			await object.body.cancel();
			return null;
		}
		const bytes = new Uint8Array(
			await readStreamWithLimit(object.body, MAX_PROFILE_IMAGE_SIZE_BYTES),
		);
		if (!hasExpectedImageSignature(bytes, type)) return null;
		return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
	} catch {
		return null;
	}
}
