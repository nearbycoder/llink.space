import { afterEach, describe, expect, it, vi } from "vitest";
import { getStoredObjectByKey } from "./object-storage";
import { storedPreviewImage, storedPreviewImageKey } from "./og-image";
import { MAX_PROFILE_IMAGE_SIZE_BYTES } from "./profile-image";

vi.mock("./object-storage", () => ({
	getStoredObjectByKey: vi.fn(),
	normalizeObjectUrlForClient: (value: string) => value,
}));
afterEach(() => {
	vi.unstubAllEnvs();
	vi.clearAllMocks();
});

describe("social preview image isolation", () => {
	it.each([
		"http://127.0.0.1/private",
		"http://169.254.169.254/latest/meta-data",
		"https://external.example/redirect",
		"//evil.example/uploads/avatars/u/image.png",
		"data:image/svg+xml,<svg/>",
		"/uploads/avatars/u/%2e%2e%2fsecret.png",
		"/api/storage/secret.png",
	])("does not read or fetch untrusted input: %s", async (url) => {
		expect(await storedPreviewImage(url)).toBeNull();
		expect(getStoredObjectByKey).not.toHaveBeenCalled();
	});
	it("embeds only validated raster bytes from uploaded objects", async () => {
		const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
		vi.mocked(getStoredObjectByKey).mockResolvedValue({
			body: new Response(png).body,
			contentLength: 8,
			contentType: "image/png",
			cacheControl: null,
			etag: null,
			lastModified: null,
			notModified: false,
		});
		expect(await storedPreviewImage("/uploads/avatars/user/image.png")).toBe(
			`data:image/png;base64,${Buffer.from(png).toString("base64")}`,
		);
		expect(getStoredObjectByKey).toHaveBeenCalledWith(
			"avatars/user/image.png",
			expect.objectContaining({ signal: expect.any(AbortSignal) }),
		);
	});
	it("rejects oversized images and misleading MIME types", async () => {
		const cancel = vi.fn();
		const base = {
			contentType: "image/png",
			cacheControl: null,
			etag: null,
			lastModified: null,
			notModified: false,
		};
		vi.mocked(getStoredObjectByKey).mockResolvedValue({
			...base,
			body: new ReadableStream({ cancel }),
			contentLength: MAX_PROFILE_IMAGE_SIZE_BYTES + 1,
		});
		expect(
			await storedPreviewImage("/uploads/avatars/user/image.png"),
		).toBeNull();
		expect(cancel).toHaveBeenCalledOnce();
		vi.mocked(getStoredObjectByKey).mockResolvedValue({
			...base,
			body: new Response("<svg/>").body,
			contentLength: 6,
		});
		expect(
			await storedPreviewImage("/uploads/avatars/user/image.png"),
		).toBeNull();
	});
	it("accepts canonical same-site upload paths and configured prefixes", () => {
		vi.stubEnv("APP_URL", "https://llink.space");
		vi.stubEnv("S3_KEY_PREFIX", "profile-media");
		expect(
			storedPreviewImageKey(
				"https://llink.space/api/storage/profile-media/avatars/user/image.png",
			),
		).toBe("profile-media/avatars/user/image.png");
	});
});
