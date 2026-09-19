export class PayloadTooLargeError extends Error {
	constructor() {
		super("Request payload too large");
		this.name = "PayloadTooLargeError";
	}
}

/** Consume at most limit bytes, cancelling the source as soon as it exceeds it. */
export async function readStreamWithLimit(
	body: ReadableStream<Uint8Array> | null,
	limit: number,
): Promise<ArrayBuffer> {
	if (!body) return new ArrayBuffer(0);
	const reader = body.getReader();
	const chunks: Uint8Array[] = [];
	let length = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			length += value.byteLength;
			if (length > limit) throw new PayloadTooLargeError();
			chunks.push(value);
		}
	} catch (error) {
		await reader.cancel().catch(() => {});
		throw error;
	} finally {
		reader.releaseLock();
	}
	const buffer = new ArrayBuffer(length);
	const bytes = new Uint8Array(buffer);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return buffer;
}

/** Bound JSON endpoints before their framework parsers allocate the full payload. */
export async function limitRequestBody(
	request: Request,
	limit: number,
): Promise<Request> {
	if (request.method === "GET" || request.method === "HEAD") return request;
	const length = Number(request.headers.get("content-length"));
	if (Number.isFinite(length) && length > limit) {
		await request.body?.cancel().catch(() => {});
		throw new PayloadTooLargeError();
	}
	const body = await readStreamWithLimit(request.body, limit);
	// Nitro may supply a request proxy; copying the Request object itself trips
	// Node's private-field checks. Copy the public request metadata instead.
	return new Request(request.url, {
		method: request.method,
		headers: request.headers,
		signal: request.signal,
		body,
	});
}

export function oversizedRequestResponse() {
	return new Response(JSON.stringify({ error: "Request payload too large" }), {
		status: 413,
		headers: {
			"content-type": "application/json",
			"cache-control": "no-store",
		},
	});
}
