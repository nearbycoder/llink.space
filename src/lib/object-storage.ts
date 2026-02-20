import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

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

interface S3StorageConfig {
	accessKeyId: string
	secretAccessKey: string
	bucket: string
	region: string
	endpoint?: string
	publicBaseUrl?: string
	forcePathStyle: boolean
	keyPrefix?: string
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
		const rootPath = path.resolve(this.rootDir)
		const fullPath = path.resolve(rootPath, normalizedKey)
		if (!fullPath.startsWith(`${rootPath}${path.sep}`)) {
			throw new Error("Invalid object key path")
		}
		await mkdir(path.dirname(fullPath), { recursive: true })
		await writeFile(fullPath, Buffer.from(input.body))
		return {
			key: normalizedKey,
			url: `${this.publicBasePath}/${normalizedKey}`,
		}
	}
}

class S3ObjectStorage implements ObjectStorage {
	private client: S3Client
	private config: S3StorageConfig

	constructor(config?: Partial<S3StorageConfig>) {
		const resolved = resolveS3StorageConfig(config)
		this.config = resolved
		this.client = new S3Client({
			region: resolved.region,
			endpoint: resolved.endpoint,
			forcePathStyle: resolved.forcePathStyle,
			credentials: {
				accessKeyId: resolved.accessKeyId,
				secretAccessKey: resolved.secretAccessKey,
			},
		})
	}

	async putObject(input: PutObjectInput): Promise<PutObjectResult> {
		const normalizedKey = input.key.replace(/^\/+/, "")
		const prefixedKey = this.config.keyPrefix
			? `${this.config.keyPrefix}/${normalizedKey}`
			: normalizedKey

		await this.client.send(
			new PutObjectCommand({
				Bucket: this.config.bucket,
				Key: prefixedKey,
				Body: new Uint8Array(input.body),
				ContentType: input.contentType,
				CacheControl: "public, max-age=31536000, immutable",
			}),
		)

		return {
			key: prefixedKey,
			url: buildS3ObjectPublicUrl(this.config, prefixedKey),
		}
	}
}

function firstNonEmpty(...values: Array<string | undefined | null>) {
	for (const value of values) {
		if (typeof value === "string" && value.trim().length > 0) {
			return value.trim()
		}
	}
	return undefined
}

function parseBoolean(value: string | undefined, defaultValue: boolean) {
	if (!value) return defaultValue
	if (value === "1") return true
	if (value === "0") return false
	const normalized = value.toLowerCase()
	if (normalized === "true" || normalized === "yes" || normalized === "on") {
		return true
	}
	if (normalized === "false" || normalized === "no" || normalized === "off") {
		return false
	}
	return defaultValue
}

function normalizeEndpoint(endpoint: string) {
	if (/^https?:\/\//i.test(endpoint)) {
		return endpoint
	}
	return `https://${endpoint}`
}

function normalizePrefix(value: string | undefined) {
	if (!value) return undefined
	return value.replace(/^\/+|\/+$/g, "")
}

function resolveS3StorageConfig(
	override?: Partial<S3StorageConfig>,
): S3StorageConfig {
	const accessKeyId = firstNonEmpty(
		override?.accessKeyId,
		process.env.S3_ACCESS_KEY_ID,
		process.env.AWS_ACCESS_KEY_ID,
	)
	const secretAccessKey = firstNonEmpty(
		override?.secretAccessKey,
		process.env.S3_SECRET_ACCESS_KEY,
		process.env.AWS_SECRET_ACCESS_KEY,
	)
	const bucket = firstNonEmpty(
		override?.bucket,
		process.env.S3_BUCKET,
		process.env.S3_BUCKET_NAME,
		process.env.AWS_BUCKET,
		process.env.AWS_BUCKET_NAME,
		process.env.BUCKET_NAME,
	)
	const region =
		firstNonEmpty(
			override?.region,
			process.env.S3_REGION,
			process.env.AWS_REGION,
			process.env.AWS_DEFAULT_REGION,
		) ?? "us-east-1"
	const endpoint = firstNonEmpty(
		override?.endpoint,
		process.env.S3_ENDPOINT,
		process.env.S3_ENDPOINT_URL,
		process.env.AWS_ENDPOINT_URL_S3,
		process.env.AWS_S3_ENDPOINT,
		process.env.R2_ENDPOINT,
	)
	const publicBaseUrl = firstNonEmpty(
		override?.publicBaseUrl,
		process.env.S3_PUBLIC_BASE_URL,
		process.env.OBJECT_STORAGE_PUBLIC_BASE_URL,
	)
	const forcePathStyle = parseBoolean(
		firstNonEmpty(
			override?.forcePathStyle === undefined
				? undefined
				: String(override.forcePathStyle),
			process.env.S3_FORCE_PATH_STYLE,
			process.env.AWS_S3_FORCE_PATH_STYLE,
		),
		true,
	)
	const keyPrefix = normalizePrefix(
		firstNonEmpty(
			override?.keyPrefix,
			process.env.S3_KEY_PREFIX,
			process.env.OBJECT_STORAGE_KEY_PREFIX,
		),
	)

	const missing: string[] = []
	if (!accessKeyId) missing.push("S3_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID")
	if (!secretAccessKey) {
		missing.push("S3_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY")
	}
	if (!bucket) missing.push("S3_BUCKET (or S3_BUCKET_NAME / BUCKET_NAME)")

	if (missing.length > 0) {
		throw new Error(
			`S3 object storage is not configured. Missing: ${missing.join(", ")}`,
		)
	}

	return {
		accessKeyId: accessKeyId!,
		secretAccessKey: secretAccessKey!,
		bucket: bucket!,
		region,
		endpoint: endpoint ? normalizeEndpoint(endpoint) : undefined,
		publicBaseUrl,
		forcePathStyle,
		keyPrefix,
	}
}

function encodeObjectKey(key: string) {
	return key.split("/").map((segment) => encodeURIComponent(segment)).join("/")
}

function buildS3ObjectPublicUrl(config: S3StorageConfig, key: string) {
	const encodedKey = encodeObjectKey(key)

	if (config.publicBaseUrl) {
		const base = config.publicBaseUrl.replace(/\/+$/, "")
		return `${base}/${encodedKey}`
	}

	if (config.endpoint) {
		const endpointUrl = new URL(config.endpoint)
		const base = endpointUrl.toString().replace(/\/+$/, "")
		if (config.forcePathStyle) {
			return `${base}/${config.bucket}/${encodedKey}`
		}
		return `${endpointUrl.protocol}//${config.bucket}.${endpointUrl.host}/${encodedKey}`
	}

	return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${encodedKey}`
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
