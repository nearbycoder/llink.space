import { describe, expect, it, vi } from "vitest";
import {
	limitRequestBody,
	PayloadTooLargeError,
	readStreamWithLimit,
} from "./request-body";

describe("bounded request bodies", () => {
	it("accepts the exact limit across chunks", async () => {
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(new Uint8Array([1, 2]));
				controller.enqueue(new Uint8Array([3, 4]));
				controller.close();
			},
		});
		expect(new Uint8Array(await readStreamWithLimit(body, 4))).toEqual(
			new Uint8Array([1, 2, 3, 4]),
		);
	});
	it("cancels oversized chunked bodies immediately", async () => {
		const cancel = vi.fn();
		let reads = 0;
		const body = new ReadableStream<Uint8Array>(
			{
				pull(controller) {
					reads++;
					controller.enqueue(new Uint8Array(4));
				},
				cancel,
			},
			{ highWaterMark: 0 },
		);
		await expect(readStreamWithLimit(body, 5)).rejects.toBeInstanceOf(
			PayloadTooLargeError,
		);
		expect(reads).toBe(2);
		expect(cancel).toHaveBeenCalledOnce();
	});
	it("handles empty bodies and propagates interrupted uploads", async () => {
		expect((await readStreamWithLimit(null, 10)).byteLength).toBe(0);
		await expect(
			readStreamWithLimit(
				new ReadableStream({
					start(controller) {
						controller.error(new Error("disconnected"));
					},
				}),
				10,
			),
		).rejects.toThrow("disconnected");
	});
});

describe("API request limits", () => {
	it("preserves request metadata and valid JSON for framework parsing", async () => {
		const request = new Request("https://app.example/api", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				cookie: "session=example",
			},
			body: JSON.stringify({ title: "Hello" }),
		});
		const bounded = await limitRequestBody(request, 100);
		expect(bounded.url).toBe(request.url);
		expect(bounded.headers.get("cookie")).toBe("session=example");
		expect(await bounded.json()).toEqual({ title: "Hello" });
	});
	it("enforces actual body size even when content-length is missing or false", async () => {
		for (const headers of [{}, { "content-length": "1" }] as Record<
			string,
			string
		>[]) {
			await expect(
				limitRequestBody(
					new Request("https://app.example/api", {
						method: "POST",
						headers,
						body: "x".repeat(101),
					}),
					100,
				),
			).rejects.toBeInstanceOf(PayloadTooLargeError);
		}
	});
	it("rejects a declared oversized body before reading it", async () => {
		const cancel = vi.fn();
		const body = new ReadableStream({ cancel }, { highWaterMark: 0 });
		const request = new Request("https://app.example/api", {
			method: "POST",
			headers: { "content-length": "101" },
			body,
			duplex: "half",
		} as RequestInit);
		await expect(limitRequestBody(request, 100)).rejects.toBeInstanceOf(
			PayloadTooLargeError,
		);
		expect(cancel).toHaveBeenCalledOnce();
	});
});
