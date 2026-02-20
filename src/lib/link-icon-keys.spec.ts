import { describe, expect, it } from "vitest";
import { isLinkIconKey, LINK_ICON_KEYS } from "#/lib/link-icon-keys";

describe("link-icon-keys", () => {
	it("contains unique keys", () => {
		expect(new Set(LINK_ICON_KEYS).size).toBe(LINK_ICON_KEYS.length);
	});

	it("accepts every declared icon key", () => {
		for (const key of LINK_ICON_KEYS) {
			expect(isLinkIconKey(key)).toBe(true);
		}
	});

	it("rejects unknown icon keys", () => {
		expect(isLinkIconKey("not-a-real-icon")).toBe(false);
		expect(isLinkIconKey("Instagram")).toBe(false);
		expect(isLinkIconKey("")).toBe(false);
	});
});
