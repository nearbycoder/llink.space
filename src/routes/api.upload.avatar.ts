import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import {
	putProfileAvatarObject,
	putProfileBackgroundObject,
} from "#/lib/object-storage";
import { isTrustedRequestOrigin } from "#/lib/security";

const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const allowedImageMimeTypes = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
]);
const imageUploadPurposes = new Set(["avatar", "background"]);

function jsonResponse(status: number, body: Record<string, string>) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"content-type": "application/json",
			"cache-control": "no-store",
		},
	});
}

function hasExpectedImageSignature(bytes: Uint8Array, mimeType: string) {
	switch (mimeType) {
		case "image/jpeg":
			return (
				bytes.length >= 3 &&
				bytes[0] === 0xff &&
				bytes[1] === 0xd8 &&
				bytes[2] === 0xff
			);
		case "image/png":
			return (
				bytes.length >= 8 &&
				bytes[0] === 0x89 &&
				bytes[1] === 0x50 &&
				bytes[2] === 0x4e &&
				bytes[3] === 0x47 &&
				bytes[4] === 0x0d &&
				bytes[5] === 0x0a &&
				bytes[6] === 0x1a &&
				bytes[7] === 0x0a
			);
		case "image/gif":
			return (
				bytes.length >= 6 &&
				bytes[0] === 0x47 &&
				bytes[1] === 0x49 &&
				bytes[2] === 0x46 &&
				bytes[3] === 0x38 &&
				(bytes[4] === 0x37 || bytes[4] === 0x39) &&
				bytes[5] === 0x61
			);
		case "image/webp":
			return (
				bytes.length >= 12 &&
				bytes[0] === 0x52 &&
				bytes[1] === 0x49 &&
				bytes[2] === 0x46 &&
				bytes[3] === 0x46 &&
				bytes[8] === 0x57 &&
				bytes[9] === 0x45 &&
				bytes[10] === 0x42 &&
				bytes[11] === 0x50
			);
		default:
			return false;
	}
}

async function postHandler({ request }: { request: Request }) {
	if (!isTrustedRequestOrigin(request)) {
		return jsonResponse(403, { error: "Invalid request origin" });
	}

	const contentLength = Number.parseInt(
		request.headers.get("content-length") ?? "0",
		10,
	);
	if (
		Number.isFinite(contentLength) &&
		contentLength > MAX_PROFILE_IMAGE_SIZE_BYTES + 1024
	) {
		return jsonResponse(413, { error: "Request payload too large" });
	}

	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user?.id) {
		return jsonResponse(401, { error: "Unauthorized" });
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return jsonResponse(400, { error: "Expected multipart/form-data" });
	}

	const file = formData.get("file");
	if (!(file instanceof File)) {
		return jsonResponse(400, { error: "Missing file upload" });
	}

	const purposeValue = formData.get("purpose");
	const purpose =
		typeof purposeValue === "string" && imageUploadPurposes.has(purposeValue)
			? purposeValue
			: "avatar";

	if (file.size <= 0) {
		return jsonResponse(400, { error: "File is empty" });
	}

	if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
		return jsonResponse(400, { error: "File too large (max 5MB)" });
	}

	const mimeType = file.type.toLowerCase();
	if (!allowedImageMimeTypes.has(mimeType)) {
		return jsonResponse(400, {
			error: "Unsupported format. Use JPG, PNG, WEBP, or GIF",
		});
	}

	const bytes = new Uint8Array(await file.arrayBuffer());
	if (!hasExpectedImageSignature(bytes, mimeType)) {
		return jsonResponse(400, {
			error: "File content does not match the declared image format",
		});
	}

	try {
		const uploaded =
			purpose === "background"
				? await putProfileBackgroundObject({
						userId: session.user.id,
						fileName: file.name,
						contentType: mimeType,
						body: bytes.buffer,
					})
				: await putProfileAvatarObject({
						userId: session.user.id,
						fileName: file.name,
						contentType: mimeType,
						body: bytes.buffer,
					});

		return jsonResponse(200, { url: uploaded.url, key: uploaded.key });
	} catch (error) {
		console.error("Profile image upload failed", error);
		return jsonResponse(500, { error: "Upload failed" });
	}
}

export const Route = createFileRoute("/api/upload/avatar")({
	server: {
		handlers: {
			POST: postHandler,
		},
	},
});
