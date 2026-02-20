import { createFileRoute } from "@tanstack/react-router"
import { auth } from "#/lib/auth"
import { putProfileAvatarObject } from "#/lib/object-storage"

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024
const allowedImageMimeTypes = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
	"image/svg+xml",
])

function jsonResponse(status: number, body: Record<string, string>) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	})
}

async function postHandler({ request }: { request: Request }) {
	const session = await auth.api.getSession({ headers: request.headers })
	if (!session?.user?.id) {
		return jsonResponse(401, { error: "Unauthorized" })
	}

	let formData: FormData
	try {
		formData = await request.formData()
	} catch {
		return jsonResponse(400, { error: "Expected multipart/form-data" })
	}

	const file = formData.get("file")
	if (!(file instanceof File)) {
		return jsonResponse(400, { error: "Missing file upload" })
	}

	if (file.size <= 0) {
		return jsonResponse(400, { error: "File is empty" })
	}

	if (file.size > MAX_AVATAR_SIZE_BYTES) {
		return jsonResponse(400, { error: "File too large (max 5MB)" })
	}

	const mimeType = file.type.toLowerCase()
	if (!allowedImageMimeTypes.has(mimeType)) {
		return jsonResponse(400, {
			error: "Unsupported format. Use JPG, PNG, WEBP, GIF, or SVG",
		})
	}

	try {
		const uploaded = await putProfileAvatarObject({
			userId: session.user.id,
			fileName: file.name,
			contentType: mimeType,
			body: await file.arrayBuffer(),
		})

		return jsonResponse(200, { url: uploaded.url, key: uploaded.key })
	} catch (error) {
		console.error("Avatar upload failed", error)
		return jsonResponse(500, { error: "Upload failed" })
	}
}

export const Route = createFileRoute("/api/upload/avatar")({
	server: {
		handlers: {
			POST: postHandler,
		},
	},
})
