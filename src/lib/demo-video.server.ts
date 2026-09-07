import { open } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

// Nitro's static handler does not currently honor byte ranges. Serve this fixed
// bundled asset with ranges so browsers can seek and Safari can load metadata.
export async function demoVideoResponse(request: Request) {
	const file = await open(
		path.join(
			process.cwd(),
			process.env.NODE_ENV === "production" ? ".output/public" : "public",
			"demo/product-tour.mp4",
		),
		"r",
	);
	try {
		const stat = await file.stat();
		const size = stat.size;
		const etag = `W/"${size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
		const headers = new Headers({
			"content-type": "video/mp4",
			"accept-ranges": "bytes",
			"cache-control": "public, max-age=3600",
			etag: etag,
			"last-modified": stat.mtime.toUTCString(),
			"x-content-type-options": "nosniff",
		});
		if (request.headers.get("if-none-match") === etag) {
			await file.close();
			return new Response(null, { status: 304, headers });
		}
		// HEAD describes the whole representation; If-Range requests are safely
		// answered with the whole current file instead of risking a stale fragment.
		const range =
			request.method === "HEAD" || request.headers.has("if-range")
				? null
				: request.headers.get("range");
		let start = 0;
		let end = size - 1;
		if (range) {
			const match = /^bytes=(\d*)-(\d*)$/.exec(range);
			if (!match || (!match[1] && !match[2])) {
				await file.close();
				headers.set("content-range", `bytes */${size}`);
				return new Response(null, { status: 416, headers });
			}
			start = match[1]
				? Number(match[1])
				: Math.max(0, size - Number(match[2]));
			end =
				match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
			if (
				!Number.isSafeInteger(start) ||
				!Number.isSafeInteger(end) ||
				start > end ||
				start >= size
			) {
				await file.close();
				headers.set("content-range", `bytes */${size}`);
				return new Response(null, { status: 416, headers });
			}
			headers.set("content-range", `bytes ${start}-${end}/${size}`);
		}
		headers.set("content-length", String(end - start + 1));
		if (request.method === "HEAD") {
			await file.close();
			return new Response(null, { headers });
		}
		const body = Readable.toWeb(
			file.createReadStream({ start, end, signal: request.signal }),
		) as ReadableStream<Uint8Array>;
		return new Response(body, { status: range ? 206 : 200, headers });
	} catch (error) {
		await file.close();
		throw error;
	}
}
