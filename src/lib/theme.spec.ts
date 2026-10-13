import { describe, expect, it } from "vitest";
import { isThemePreference, resolveTheme, themeInitScript } from "./theme";

describe("theme preference", () => {
	it("resolves explicit choices regardless of the system setting", () => {
		expect(resolveTheme("light", true)).toBe("light");
		expect(resolveTheme("dark", false)).toBe("dark");
	});

	it("follows the system setting when set to system", () => {
		expect(resolveTheme("system", true)).toBe("dark");
		expect(resolveTheme("system", false)).toBe("light");
	});

	it("accepts only known preferences", () => {
		expect(isThemePreference("dark")).toBe(true);
		expect(isThemePreference("system")).toBe(true);
		expect(isThemePreference("sepia")).toBe(false);
		expect(isThemePreference(null)).toBe(false);
	});

	it("keeps the pre-paint script self-contained and failure-safe", () => {
		expect(themeInitScript).toContain("llink-theme");
		expect(themeInitScript).toContain("catch");
		expect(themeInitScript).not.toMatch(/import|require\(/);
	});
});
