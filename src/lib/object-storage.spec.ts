import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	GetObjectCommand,
	HeadObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalObjectStorage, S3ObjectStorage } from "./object-storage";

afterEach(() => vi.restoreAllMocks());

describe("local object streaming", () => {
	it("streams bytes, validates caches, and returns metadata without a body for HEAD", async () => {
		const rootDir = await mkdtemp(path.join(os.tmpdir(), "llink-objects-"));
		try {
			await writeFile(
				path.join(rootDir, "avatar.png"),
				new Uint8Array([1, 2, 3]),
			);
			const storage = new LocalObjectStorage({ rootDir });
			const object = await storage.getObject("avatar.png");
			expect(object?.body).toBeInstanceOf(ReadableStream);
			expect(
				new Uint8Array(await new Response(object?.body).arrayBuffer()),
			).toEqual(new Uint8Array([1, 2, 3]));
			const cached = await storage.getObject("avatar.png", {
				ifNoneMatch: object?.etag ?? "",
			});
			expect(cached?.notModified).toBe(true);
			expect(cached?.body).toBeNull();
			const head = await storage.getObject("avatar.png", { head: true });
			expect(head?.contentLength).toBe(3);
			expect(head?.body).toBeNull();
			await expect(storage.getObject("../escape.png")).rejects.toThrow(
				"Invalid object key",
			);
			expect(await storage.getObject("missing.png")).toBeNull();
		} finally {
			await rm(rootDir, { recursive: true, force: true });
		}
	});
});

describe("S3 streaming contract", () => {
	const config = {
		bucket: "test",
		region: "us-east-1",
		accessKeyId: "test",
		secretAccessKey: "test",
	};
	it("passes through the SDK stream and cancels it without buffering", async () => {
		const cancel = vi.fn();
		const stream = new ReadableStream<Uint8Array>({ cancel });
		const send = vi.spyOn(S3Client.prototype, "send").mockResolvedValue({
			Body: { transformToWebStream: () => stream },
			ContentType: "image/png",
			ContentLength: 100,
			ETag: '"image"',
		} as never);
		const object = await new S3ObjectStorage(config).getObject(
			"avatars/a/image.png",
			{ ifNoneMatch: '"old"', ifModifiedSince: new Date() },
		);
		expect(object?.body).toBe(stream);
		const command = send.mock.calls[0][0] as GetObjectCommand;
		expect(command).toBeInstanceOf(GetObjectCommand);
		expect(command.input.IfNoneMatch).toBe('"old"');
		expect(command.input.IfModifiedSince).toBeUndefined();
		await object?.body?.cancel();
		expect(cancel).toHaveBeenCalledOnce();
	});
	it("uses HEAD for metadata-only requests and handles S3 not-modified", async () => {
		const send = vi
			.spyOn(S3Client.prototype, "send")
			.mockResolvedValue({ ContentLength: 100 } as never);
		const storage = new S3ObjectStorage(config);
		expect(
			(await storage.getObject("avatar.png", { head: true }))?.body,
		).toBeNull();
		expect(send.mock.calls[0][0]).toBeInstanceOf(HeadObjectCommand);
		send.mockRejectedValue({
			$metadata: { httpStatusCode: 304 },
			$response: {
				headers: {
					etag: '"image"',
					"cache-control": "public, max-age=3600",
					"last-modified": "Sun, 06 Sep 2026 12:00:00 GMT",
				},
			},
		});
		const cached = await storage.getObject("avatar.png", {
			ifNoneMatch: '"image"',
		});
		expect(cached?.notModified).toBe(true);
		expect(cached?.etag).toBe('"image"');
		expect(cached?.cacheControl).toBe("public, max-age=3600");
		expect(cached?.lastModified?.toISOString()).toBe(
			"2026-09-06T12:00:00.000Z",
		);
	});
});
