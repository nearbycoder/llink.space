import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import {
	putProfileAvatarObject,
	putProfileBackgroundObject,
} from "#/lib/object-storage";
import {
	allowedImageMimeTypes,
	hasExpectedImageSignature,
	MAX_PROFILE_IMAGE_SIZE_BYTES,
} from "#/lib/profile-image";
import { PayloadTooLargeError, readStreamWithLimit } from "#/lib/request-body";
import { isTrustedRequestOrigin } from "#/lib/security";

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
		contentLength > MAX_PROFILE_IMAGE_SIZE_BYTES + 64 * 1024
	) {
		return jsonResponse(413, { error: "Request payload too large" });
	}

	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user?.id) {
		return jsonResponse(401, { error: "Unauthorized" });
	}

	let formData: FormData;
	try {
		const body = await readStreamWithLimit(
			request.body,
			MAX_PROFILE_IMAGE_SIZE_BYTES + 64 * 1024,
		);
		formData = await new Response(body, {
			headers: { "content-type": request.headers.get("content-type") ?? "" },
		}).formData();
	} catch (error) {
		if (error instanceof PayloadTooLargeError)
			return jsonResponse(413, { error: "Request payload too large" });
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
