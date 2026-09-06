import { randomUUID } from "node:crypto";
import { mkdir, open, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import {
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { type ObjectReadOptions, objectNotModified } from "./http-cache";

interface PutObjectInput {
	key: string;
	body: ArrayBuffer;
	contentType: string;
}

interface PutObjectResult {
	key: string;
	url: string;
}

export interface GetObjectResult {
	body: ReadableStream<Uint8Array> | null;
	contentLength: number | null;
	notModified: boolean;
	contentType: string | null;
	cacheControl: string | null;
	etag: string | null;
	lastModified: Date | null;
}

interface ObjectStorage {
	putObject(input: PutObjectInput): Promise<PutObjectResult>;
	getObject(
		key: string,
		options?: ObjectReadOptions,
	): Promise<GetObjectResult | null>;
}

interface S3StorageConfig {
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
	region: string;
	endpoint?: string;
	publicBaseUrl?: string;
	forcePathStyle: boolean;
	keyPrefix?: string;
}

export class LocalObjectStorage implements ObjectStorage {
	private rootDir: string;
	private publicBasePath: string;

	constructor(options?: { rootDir?: string; publicBasePath?: string }) {
		this.rootDir =
			options?.rootDir ??
			process.env.LOCAL_OBJECT_STORAGE_DIR ??
			path.join(process.cwd(), "public", "uploads");
		this.publicBasePath =
			options?.publicBasePath ??
			process.env.LOCAL_OBJECT_STORAGE_BASE_PATH ??
			"/uploads";
	}

	async putObject(input: PutObjectInput): Promise<PutObjectResult> {
		const normalizedKey = input.key.replace(/^\/+/, "");
		const rootPath = path.resolve(this.rootDir);
		const fullPath = path.resolve(rootPath, normalizedKey);
		if (!fullPath.startsWith(`${rootPath}${path.sep}`)) {
			throw new Error("Invalid object key path");
		}
		await mkdir(path.dirname(fullPath), { recursive: true });
		await writeFile(fullPath, Buffer.from(input.body));
		return {
			key: normalizedKey,
			url: `${this.publicBasePath}/${normalizedKey}`,
		};
	}

	async getObject(
		key: string,
		options: ObjectReadOptions = {},
	): Promise<GetObjectResult | null> {
		const normalizedKey = key.replace(/^\/+/, "");
		const rootPath = path.resolve(this.rootDir);
		const fullPath = path.resolve(rootPath, normalizedKey);
		if (!fullPath.startsWith(`${rootPath}${path.sep}`)) {
			throw new Error("Invalid object key path");
		}

		try {
			const file = await open(fullPath, "r");
			try {
				const stat = await file.stat();
				if (!stat.isFile()) {
					await file.close();
					return null;
				}
				const etag = `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
				const notModified = objectNotModified(options, etag, stat.mtime);
				const body =
					options.head || notModified
						? null
						: (Readable.toWeb(
								file.createReadStream({ signal: options.signal }),
							) as ReadableStream<Uint8Array>);
				if (!body) await file.close();
				return {
					body,
					notModified,
					contentLength: stat.size,
					contentType: contentTypeFromObjectKey(normalizedKey),
					cacheControl: "public, max-age=31536000, immutable",
					etag,
					lastModified: stat.mtime,
				};
			} catch (error) {
				await file.close();
				throw error;
			}
		} catch (error) {
			if (
				error &&
				typeof error === "object" &&
				"code" in error &&
				error.code === "ENOENT"
			) {
				return null;
			}
			throw error;
		}
	}
}

export class S3ObjectStorage implements ObjectStorage {
	private client: S3Client;
	private config: S3StorageConfig;

	constructor(config?: Partial<S3StorageConfig>) {
		const resolved = resolveS3StorageConfig(config);
		this.config = resolved;
		this.client = new S3Client({
			region: resolved.region,
			endpoint: resolved.endpoint,
			forcePathStyle: resolved.forcePathStyle,
			credentials: {
				accessKeyId: resolved.accessKeyId,
				secretAccessKey: resolved.secretAccessKey,
			},
		});
	}

	async putObject(input: PutObjectInput): Promise<PutObjectResult> {
		const normalizedKey = input.key.replace(/^\/+/, "");
		const prefixedKey = this.config.keyPrefix
			? `${this.config.keyPrefix}/${normalizedKey}`
			: normalizedKey;

		await this.client.send(
			new PutObjectCommand({
				Bucket: this.config.bucket,
				Key: prefixedKey,
				Body: new Uint8Array(input.body),
				ContentType: input.contentType,
				CacheControl: "public, max-age=31536000, immutable",
			}),
		);

		return {
			key: prefixedKey,
			url: buildS3ObjectPublicUrl(this.config, prefixedKey),
		};
	}

	async getObject(
		key: string,
		options: ObjectReadOptions = {},
	): Promise<GetObjectResult | null> {
		const normalizedKey = key.replace(/^\/+/, "");

		try {
			const input = {
				Bucket: this.config.bucket,
				Key: normalizedKey,
				IfNoneMatch: options.ifNoneMatch,
				// ETag validation takes precedence over dates, as for the local backend.
				IfModifiedSince:
					options.ifNoneMatch === undefined
						? options.ifModifiedSince
						: undefined,
			};
			const response = await this.client.send(
				options.head
					? new HeadObjectCommand(input)
					: new GetObjectCommand(input),
				{ abortSignal: options.signal },
			);
			const body =
				"Body" in response && response.Body
					? response.Body.transformToWebStream()
					: null;
			return {
				body,
				notModified: false,
				contentLength: response.ContentLength ?? null,
				contentType: response.ContentType ?? null,
				cacheControl: response.CacheControl ?? null,
				etag: response.ETag ?? null,
				lastModified: response.LastModified ?? null,
			};
		} catch (error) {
			if (
				error &&
				typeof error === "object" &&
				"$metadata" in error &&
				(error.$metadata as { httpStatusCode?: number }).httpStatusCode === 304
			) {
				const headers = (
					error as { $response?: { headers?: Record<string, string> } }
				).$response?.headers;
				const modified = headers?.["last-modified"];
				const lastModified = modified ? new Date(modified) : null;
				return {
					body: null,
					notModified: true,
					contentLength: null,
					contentType: null,
					cacheControl: headers?.["cache-control"] ?? null,
					etag: headers?.etag ?? null,
					lastModified:
						lastModified && Number.isFinite(lastModified.getTime())
							? lastModified
							: null,
				};
			}
			if (isS3ObjectNotFoundError(error)) {
				return null;
			}
			throw error;
		}
	}
}

function firstNonEmpty(...values: Array<string | undefined | null>) {
	for (const value of values) {
		if (typeof value === "string" && value.trim().length > 0) {
			return value.trim();
		}
	}
	return undefined;
}

function parseBoolean(value: string | undefined, defaultValue: boolean) {
	if (!value) return defaultValue;
	if (value === "1") return true;
	if (value === "0") return false;
	const normalized = value.toLowerCase();
	if (normalized === "true" || normalized === "yes" || normalized === "on") {
		return true;
	}
	if (normalized === "false" || normalized === "no" || normalized === "off") {
		return false;
	}
	return defaultValue;
}

function normalizeProxyBasePath(value: string | undefined) {
	const fallback = "/api/storage";
	if (!value) return fallback;
	const trimmed = value.trim();
	if (!trimmed) return fallback;
	const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
	return withLeadingSlash.replace(/\/+$/, "") || fallback;
}

function getObjectProxyBasePath() {
	return normalizeProxyBasePath(process.env.OBJECT_STORAGE_PROXY_BASE_PATH);
}

function normalizeEndpoint(endpoint: string) {
	if (/^https?:\/\//i.test(endpoint)) {
		return endpoint;
	}
	return `https://${endpoint}`;
}

function normalizePrefix(value: string | undefined) {
	if (!value) return undefined;
	return value.replace(/^\/+|\/+$/g, "");
}

function resolveS3StorageConfig(
	override?: Partial<S3StorageConfig>,
): S3StorageConfig {
	const accessKeyId = firstNonEmpty(
		override?.accessKeyId,
		process.env.S3_ACCESS_KEY_ID,
		process.env.AWS_ACCESS_KEY_ID,
	);
	const secretAccessKey = firstNonEmpty(
		override?.secretAccessKey,
		process.env.S3_SECRET_ACCESS_KEY,
		process.env.AWS_SECRET_ACCESS_KEY,
	);
	const bucket = firstNonEmpty(
		override?.bucket,
		process.env.S3_BUCKET,
		process.env.S3_BUCKET_NAME,
		process.env.AWS_BUCKET,
		process.env.AWS_BUCKET_NAME,
		process.env.BUCKET_NAME,
	);
	const region =
		firstNonEmpty(
			override?.region,
			process.env.S3_REGION,
			process.env.AWS_REGION,
			process.env.AWS_DEFAULT_REGION,
		) ?? "us-east-1";
	const endpoint = firstNonEmpty(
		override?.endpoint,
		process.env.S3_ENDPOINT,
		process.env.S3_ENDPOINT_URL,
		process.env.AWS_ENDPOINT_URL_S3,
		process.env.AWS_S3_ENDPOINT,
		process.env.R2_ENDPOINT,
	);
	const publicBaseUrl = firstNonEmpty(
		override?.publicBaseUrl,
		process.env.S3_PUBLIC_BASE_URL,
		process.env.OBJECT_STORAGE_PUBLIC_BASE_URL,
	);
	const forcePathStyle = parseBoolean(
		firstNonEmpty(
			override?.forcePathStyle === undefined
				? undefined
				: String(override.forcePathStyle),
			process.env.S3_FORCE_PATH_STYLE,
			process.env.AWS_S3_FORCE_PATH_STYLE,
		),
		true,
	);
	const keyPrefix = normalizePrefix(
		firstNonEmpty(
			override?.keyPrefix,
			process.env.S3_KEY_PREFIX,
			process.env.OBJECT_STORAGE_KEY_PREFIX,
		),
	);

	const missing: string[] = [];
	if (!accessKeyId) missing.push("S3_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID");
	if (!secretAccessKey) {
		missing.push("S3_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY");
	}
	if (!bucket) missing.push("S3_BUCKET (or S3_BUCKET_NAME / BUCKET_NAME)");

	if (missing.length > 0) {
		throw new Error(
			`S3 object storage is not configured. Missing: ${missing.join(", ")}`,
		);
	}

	if (!accessKeyId || !secretAccessKey || !bucket) {
		throw new Error("S3 object storage is not configured");
	}

	return {
		accessKeyId,
		secretAccessKey,
		bucket,
		region,
		endpoint: endpoint ? normalizeEndpoint(endpoint) : undefined,
		publicBaseUrl,
		forcePathStyle,
		keyPrefix,
	};
}

function encodeObjectKey(key: string) {
	return key
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");
}

function buildS3ObjectPublicUrl(config: S3StorageConfig, key: string) {
	const encodedKey = encodeObjectKey(key);

	if (config.publicBaseUrl) {
		const base = config.publicBaseUrl.replace(/\/+$/, "");
		return `${base}/${encodedKey}`;
	}
	return `${getObjectProxyBasePath()}/${encodedKey}`;
}

function getObjectStorage(): ObjectStorage {
	const backend = (process.env.OBJECT_STORAGE_BACKEND ?? "local").toLowerCase();
	if (backend === "s3") {
		return new S3ObjectStorage();
	}
	return new LocalObjectStorage();
}

const storage = getObjectStorage();

function isS3ObjectNotFoundError(error: unknown) {
	if (!error || typeof error !== "object") return false;

	const maybeError = error as {
		name?: string;
		Code?: string;
		$metadata?: { httpStatusCode?: number };
	};

	return (
		maybeError.name === "NoSuchKey" ||
		maybeError.name === "NotFound" ||
		maybeError.Code === "NoSuchKey" ||
		maybeError.$metadata?.httpStatusCode === 404
	);
}

function decodeObjectKey(value: string) {
	if (!value) return value;
	try {
		return value
			.split("/")
			.map((segment) => decodeURIComponent(segment))
			.join("/");
	} catch {
		return value;
	}
}

function extractObjectKeyFromAbsoluteUrl(
	url: URL,
	config: S3StorageConfig,
): string | null {
	if (config.publicBaseUrl) {
		try {
			const publicBase = new URL(config.publicBaseUrl);
			if (publicBase.origin === url.origin) {
				const publicPath = publicBase.pathname.replace(/\/+$/, "");
				const prefix = `${publicPath}/`;
				if (url.pathname.startsWith(prefix)) {
					return decodeObjectKey(url.pathname.slice(prefix.length));
				}
			}
		} catch {
			// Ignore malformed public base URLs.
		}
	}

	if (config.endpoint) {
		try {
			const endpoint = new URL(config.endpoint);
			if (url.host === endpoint.host) {
				const prefix = `/${config.bucket}/`;
				if (url.pathname.startsWith(prefix)) {
					return decodeObjectKey(url.pathname.slice(prefix.length));
				}
			}
			if (url.host === `${config.bucket}.${endpoint.host}`) {
				return decodeObjectKey(url.pathname.replace(/^\/+/, ""));
			}
		} catch {
			// Ignore malformed endpoint URLs.
		}
	}

	const awsHost = `${config.bucket}.s3.${config.region}.amazonaws.com`;
	if (url.host === awsHost) {
		return decodeObjectKey(url.pathname.replace(/^\/+/, ""));
	}

	return null;
}

function contentTypeFromObjectKey(key: string) {
	const extension = path.extname(key).toLowerCase();
	switch (extension) {
		case ".jpg":
		case ".jpeg":
			return "image/jpeg";
		case ".png":
			return "image/png";
		case ".webp":
			return "image/webp";
		case ".gif":
			return "image/gif";
		default:
			return "application/octet-stream";
	}
}

const extensionByMimeType: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"image/gif": "gif",
};

export function buildProfileAvatarObjectKey({
	userId,
	fileName,
	contentType,
}: {
	userId: string;
	fileName: string;
	contentType: string;
}) {
	const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
	const extFromName = path.extname(fileName).replace(".", "").toLowerCase();
	const extFromMime = extensionByMimeType[contentType];
	const ext = extFromMime || extFromName || "bin";
	return `avatars/${safeUserId}/${Date.now()}-${randomUUID()}.${ext}`;
}

export function buildProfileBackgroundObjectKey({
	userId,
	fileName,
	contentType,
}: {
	userId: string;
	fileName: string;
	contentType: string;
}) {
	const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
	const extFromName = path.extname(fileName).replace(".", "").toLowerCase();
	const extFromMime = extensionByMimeType[contentType];
	const ext = extFromMime || extFromName || "bin";
	return `backgrounds/${safeUserId}/${Date.now()}-${randomUUID()}.${ext}`;
}

export async function putProfileAvatarObject(input: {
	userId: string;
	fileName: string;
	contentType: string;
	body: ArrayBuffer;
}) {
	const key = buildProfileAvatarObjectKey(input);
	return storage.putObject({
		key,
		body: input.body,
		contentType: input.contentType,
	});
}

export async function putProfileBackgroundObject(input: {
	userId: string;
	fileName: string;
	contentType: string;
	body: ArrayBuffer;
}) {
	const key = buildProfileBackgroundObjectKey(input);
	return storage.putObject({
		key,
		body: input.body,
		contentType: input.contentType,
	});
}

export async function getStoredObjectByKey(
	key: string,
	options?: ObjectReadOptions,
) {
	return storage.getObject(key, options);
}

export function normalizeObjectUrlForClient(url: string): string;
export function normalizeObjectUrlForClient(url: string | null): string | null;
export function normalizeObjectUrlForClient(
	url: string | null | undefined,
): string | null | undefined;
export function normalizeObjectUrlForClient(url: string | null | undefined) {
	if (url === null || url === undefined) return url;
	const trimmed = url.trim();
	if (!trimmed) return trimmed;

	if (trimmed.startsWith("/")) {
		return trimmed;
	}

	const backend = (process.env.OBJECT_STORAGE_BACKEND ?? "local").toLowerCase();
	if (backend !== "s3") return url;

	let parsedUrl: URL;
	try {
		parsedUrl = new URL(trimmed);
	} catch {
		return url;
	}

	let config: S3StorageConfig;
	try {
		config = resolveS3StorageConfig();
	} catch {
		return url;
	}

	const key = extractObjectKeyFromAbsoluteUrl(parsedUrl, config);
	if (!key) return url;

	return `${getObjectProxyBasePath()}/${encodeObjectKey(key)}`;
}
