import { describe, expect, it } from "vitest";
import { cn } from "#/lib/utils";

describe("cn", () => {
	it("joins class names and ignores falsy values", () => {
		expect(cn("text-sm", false, null, undefined, "font-medium")).toBe(
			"text-sm font-medium",
		);
	});

	it("resolves conflicting tailwind utility classes", () => {
		expect(cn("p-2", "p-4")).toBe("p-4");
		expect(cn("text-sm", "text-lg", "text-sm")).toBe("text-sm");
	});
});
