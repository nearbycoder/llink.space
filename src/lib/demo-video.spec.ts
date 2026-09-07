import { describe, expect, it } from "vitest";
import { demoVideoResponse } from "./demo-video.server";

const request = (headers: Record<string, string> = {}, method = "GET") =>
	new Request("https://llink.space/api/demo-video", { method, headers });

describe("bundled product video delivery", () => {
	it("serves MP4 metadata and exact byte ranges for playback and seeking", async () => {
		const head = await demoVideoResponse(request({}, "HEAD"));
		const size = Number(head.headers.get("content-length"));
		expect(head.status).toBe(200);
		expect(head.headers.get("accept-ranges")).toBe("bytes");
		expect(size).toBeGreaterThan(1000);
		expect(await head.text()).toBe("");
		const fragment = await demoVideoResponse(request({ range: "bytes=4-7" }));
		expect(fragment.status).toBe(206);
		expect(fragment.headers.get("content-range")).toBe(`bytes 4-7/${size}`);
		expect(fragment.headers.get("content-length")).toBe("4");
		expect(await fragment.text()).toBe("ftyp");
		const suffix = await demoVideoResponse(request({ range: "bytes=-10" }));
		expect(suffix.headers.get("content-range")).toBe(
			`bytes ${size - 10}-${size - 1}/${size}`,
		);
		expect((await suffix.arrayBuffer()).byteLength).toBe(10);
		const openEnded = await demoVideoResponse(
			request({ range: `bytes=${size - 5}-` }),
		);
		expect(openEnded.status).toBe(206);
		expect((await openEnded.arrayBuffer()).byteLength).toBe(5);
	});
	it.each([
		"bytes=9-2",
		"bytes=-0",
		"bytes=999999999999-",
		"bytes=",
		"bytes=0-1,3-4",
	])("rejects invalid or unsatisfiable range %s", async (range) => {
		const response = await demoVideoResponse(request({ range }));
		expect(response.status).toBe(416);
		expect(response.headers.get("content-range")).toMatch(/^bytes \*\/\d+$/);
		expect(await response.text()).toBe("");
	});
	it("revalidates the current video and sends the whole file for If-Range", async () => {
		const head = await demoVideoResponse(request({}, "HEAD"));
		const cached = await demoVideoResponse(
			request({ "if-none-match": head.headers.get("etag") ?? "" }),
		);
		expect(cached.status).toBe(304);
		const stale = await demoVideoResponse(
			request({ range: "bytes=0-1", "if-range": "old-version" }),
		);
		expect(stale.status).toBe(200);
		expect(stale.headers.get("content-length")).toBe(
			head.headers.get("content-length"),
		);
		await stale.body?.cancel();
	});
});
