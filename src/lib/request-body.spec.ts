import { describe, expect, it, vi } from "vitest";
import { PayloadTooLargeError, readStreamWithLimit } from "./request-body";

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
