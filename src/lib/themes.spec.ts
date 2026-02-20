import { describe, expect, it } from "vitest";
import { getTheme, themes } from "#/lib/themes";

describe("themes", () => {
	it("returns the requested theme when the id exists", () => {
		expect(getTheme("default")).toBe(themes.default);
		expect(getTheme("dark")).toBe(themes.dark);
		expect(getTheme("slate")).toBe(themes.slate);
	});

	it("falls back to default for unknown ids", () => {
		expect(getTheme("unknown-theme-id")).toBe(themes.default);
	});

	it("keeps internal theme ids aligned with object keys", () => {
		for (const [key, theme] of Object.entries(themes)) {
			expect(theme.id).toBe(key);
		}
	});
});
