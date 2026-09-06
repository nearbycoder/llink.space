import { createServer, request as httpRequest } from "node:http";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("uploaded images stream with validators and previews cannot fetch arbitrary URLs", async ({ request, baseURL }) => {
	test.setTimeout(60_000);
	const username = `media${Date.now().toString(36)}`;
	expect((await request.post("/api/auth/sign-up/email", { data: { name: "Media Creator", email: `${username}@example.test`, password: "MediaReviewPassword123!" } })).ok()).toBe(true);
	expect((await request.post("/api/trpc/profile.create", { data: { json: { username } } })).ok()).toBe(true);
	const png = await readFile("public/android-chrome-192x192.png");
	const uploaded = await request.post("/api/upload/avatar", { multipart: { file: { name: "avatar.png", mimeType: "image/png", buffer: png } } });
	expect(uploaded.ok(), await uploaded.text()).toBe(true);
	const { url, key } = await uploaded.json();
	const asset = `/api/storage/${key}`;
	const first = await request.get(asset, { headers: { accept: "image/avif,image/webp,image/*,*/*;q=0.8", "sec-fetch-dest": "image" } });
	expect(first.status(), first.ok() ? "" : JSON.stringify({ url, key, body: await first.text() })).toBe(200);
	expect(await first.body()).toEqual(png);
	// Bun's streamed response uses chunked framing; Node can preserve the known
	// length. Both are valid. Exact payload bytes are asserted above.
	if (first.headers()["content-length"] !== undefined) {
		expect(first.headers()["content-length"]).toBe(String(png.length));
	} else {
		expect(first.headers()["transfer-encoding"]).toBe("chunked");
	}
	const etag = first.headers().etag;
	expect(etag).toBeTruthy();
	const cached = await request.get(asset, { headers: { "if-none-match": `"old", ${etag}` } });
	expect(cached.status()).toBe(304);
	expect(await cached.body()).toHaveLength(0);
	expect((await request.get(asset, { headers: { "if-modified-since": first.headers()["last-modified"] } })).status()).toBe(304);
	expect((await request.get(asset, { headers: { "if-none-match": '"wrong"', "if-modified-since": first.headers()["last-modified"] } })).status()).toBe(200);
	const head = await request.head(asset);
	expect(head.status()).toBe(200);
	// HEAD may omit representation length but must retain the media metadata.
	if (head.headers()["content-length"] !== undefined) {
		expect(head.headers()["content-length"]).toBe(String(png.length));
	}
	expect(head.headers()["content-type"]).toContain("image/png");
	expect(head.headers().etag).toBe(etag);
	expect(await head.body()).toHaveLength(0);
	expect((await request.get("/api/storage/missing.png")).status()).toBe(404);
	await request.post("/api/trpc/profile.update", { data: { json: { avatarUrl: url } } });
	const ownPreview = await request.get(`/api/og/u/${username}`);
	expect(ownPreview.status(), await ownPreview.text()).toBe(200);
	expect(ownPreview.headers()["content-type"]).toContain("image/png");

	// This endpoint belongs to the test; no internal or third-party systems are probed.
	let outboundRequests = 0;
	const trap = createServer((_req, res) => { outboundRequests++; res.writeHead(302, { location: "https://example.com/image.png" }); res.end(); });
	await new Promise<void>((resolve) => trap.listen(0, "127.0.0.1", resolve));
	try {
		const address = trap.address();
		if (!address || typeof address === "string") throw new Error("Missing test server address");
		await request.post("/api/trpc/profile.update", { data: { json: { avatarUrl: `http://127.0.0.1:${address.port}/redirect` } } });
		const preview = await request.get(`/api/og/u/${username}`);
		expect(preview.status()).toBe(200);
		expect(outboundRequests).toBe(0);
	} finally { await new Promise<void>((resolve, reject) => trap.close((error) => error ? reject(error) : resolve())); }

	const invalid = await request.post("/api/upload/avatar", { multipart: { file: { name: "fake.png", mimeType: "image/png", buffer: Buffer.from("<svg/>") } } });
	expect(invalid.status()).toBe(400);
	const state = await request.storageState();
	const cookie = state.cookies.map((item) => `${item.name}=${item.value}`).join("; ");
	const status = await new Promise<number>((resolve, reject) => {
		const req = httpRequest(`${baseURL}/api/upload/avatar`, { method: "POST", headers: { cookie, origin: baseURL ?? "", "content-type": "multipart/form-data; boundary=oversized-test", "transfer-encoding": "chunked" } }, (res) => { res.resume(); res.on("end", () => resolve(res.statusCode ?? 0)); });
		req.on("error", reject);
		// No content-length. The parser must stop on actual bytes, before multipart parsing.
		for (let i = 0; i < 82; i++) req.write(Buffer.alloc(64 * 1024));
		req.end();
	});
	expect(status).toBe(413);
});
