import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"

interface PutObjectInput {
	key: string
	body: ArrayBuffer
	contentType: string
}

interface PutObjectResult {
	key: string
	url: string
}

interface ObjectStorage {
	putObject(input: PutObjectInput): Promise<PutObjectResult>
}

class LocalObjectStorage implements ObjectStorage {
	private rootDir: string
	private publicBasePath: string

	constructor(options?: { rootDir?: string; publicBasePath?: string }) {
		this.rootDir =
			options?.rootDir ??
			process.env.LOCAL_OBJECT_STORAGE_DIR ??
			path.join(process.cwd(), "public", "uploads")
		this.publicBasePath =
			options?.publicBasePath ??
			process.env.LOCAL_OBJECT_STORAGE_BASE_PATH ??
			"/uploads"
	}

	async putObject(input: PutObjectInput): Promise<PutObjectResult> {
		const normalizedKey = input.key.replace(/^\/+/, "")
		const fullPath = path.join(this.rootDir, normalizedKey)
		await mkdir(path.dirname(fullPath), { recursive: true })
		await writeFile(fullPath, Buffer.from(input.body))
		return {
			key: normalizedKey,
			url: `${this.publicBasePath}/${normalizedKey}`,
		}
	}
}

class S3ObjectStorage implements ObjectStorage {
	async putObject(_input: PutObjectInput): Promise<PutObjectResult> {
		throw new Error("S3 storage backend is not configured yet")
	}
}

function getObjectStorage(): ObjectStorage {
	const backend = (process.env.OBJECT_STORAGE_BACKEND ?? "local").toLowerCase()
	if (backend === "s3") {
		return new S3ObjectStorage()
	}
	return new LocalObjectStorage()
}

const storage = getObjectStorage()

const extensionByMimeType: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"image/gif": "gif",
	"image/svg+xml": "svg",
}

export function buildProfileAvatarObjectKey({
	userId,
	fileName,
	contentType,
}: {
	userId: string
	fileName: string
	contentType: string
}) {
	const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "")
	const extFromName = path.extname(fileName).replace(".", "").toLowerCase()
	const extFromMime = extensionByMimeType[contentType]
	const ext = extFromMime || extFromName || "bin"
	return `avatars/${safeUserId}/${Date.now()}-${randomUUID()}.${ext}`
}

export async function putProfileAvatarObject(input: {
	userId: string
	fileName: string
	contentType: string
	body: ArrayBuffer
}) {
	const key = buildProfileAvatarObjectKey(input)
	return storage.putObject({
		key,
		body: input.body,
		contentType: input.contentType,
	})
}
