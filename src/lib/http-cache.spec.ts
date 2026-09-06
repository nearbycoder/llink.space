import { describe, expect, it } from "vitest";
import { objectNotModified, objectReadOptions } from "./http-cache";

describe("conditional image requests", () => {
	const modified = new Date("2026-09-06T12:00:00.500Z");
	it("matches weak and strong ETags, lists, and wildcard", () => {
		for (const value of ['"abc"', 'W/"abc"', '"other", "abc"', "*"])
			expect(
				objectNotModified({ ifNoneMatch: value }, 'W/"abc"', modified),
			).toBe(true);
	});
	it("ETags take precedence over an otherwise matching date", () => {
		expect(
			objectNotModified(
				{ ifNoneMatch: '"wrong"', ifModifiedSince: new Date("2027-01-01") },
				'"abc"',
				modified,
			),
		).toBe(false);
	});
	it("compares dates at HTTP second precision and ignores invalid dates", () => {
		expect(
			objectNotModified(
				{ ifModifiedSince: new Date("2026-09-06T12:00:00Z") },
				null,
				modified,
			),
		).toBe(true);
		expect(
			objectReadOptions(
				new Request("https://example.com", {
					headers: { "if-modified-since": "invalid" },
				}),
			).ifModifiedSince,
		).toBeUndefined();
	});
});
