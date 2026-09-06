import { describe, expect, it } from "vitest";
import { isLinkPublished, validSchedule } from "./link-publishing";

describe("publishing windows", () => {
	const start = "2026-09-06T12:00:00.000Z",
		end = "2026-09-07T12:00:00.000Z";
	it("opens inclusively and expires exclusively", () => {
		const link = { isActive: true, publishAt: start, expireAt: end };
		expect(isLinkPublished(link, Date.parse(start) - 1)).toBe(false);
		expect(isLinkPublished(link, Date.parse(start))).toBe(true);
		expect(isLinkPublished(link, Date.parse(end))).toBe(false);
		expect(
			isLinkPublished({ ...link, isActive: false }, Date.parse(start)),
		).toBe(false);
	});
	it("accepts open windows and rejects inverted or zero windows", () => {
		expect(validSchedule({ publishAt: start })).toBe(true);
		expect(validSchedule({ publishAt: end, expireAt: start })).toBe(false);
		expect(validSchedule({ publishAt: start, expireAt: start })).toBe(false);
	});
});
