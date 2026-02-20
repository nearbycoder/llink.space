import { describe, expect, it } from "vitest";
import { isLinkIconKey, LINK_ICON_KEYS } from "#/lib/link-icon-keys";
import {
	LINK_ICON_OPTIONS,
	LINK_ICON_OPTIONS_BY_KEY,
} from "#/components/links/icon-options";

describe("icon-options", () => {
	it("has one option per icon key", () => {
		expect(LINK_ICON_OPTIONS).toHaveLength(LINK_ICON_KEYS.length);
	});

	it("uses valid and unique icon keys in options", () => {
		const keys = LINK_ICON_OPTIONS.map((option) => option.key);
		expect(new Set(keys).size).toBe(keys.length);
		for (const key of keys) {
			expect(isLinkIconKey(key)).toBe(true);
		}
	});

	it("exposes a by-key lookup for all options", () => {
		for (const option of LINK_ICON_OPTIONS) {
			expect(LINK_ICON_OPTIONS_BY_KEY[option.key]).toEqual(option);
		}
	});
});
