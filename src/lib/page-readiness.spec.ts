import { expect, it } from "vitest";
import { contrastRatio, pageReadiness } from "./page-readiness";

it("calculates WCAG contrast endpoints and excludes unpublished links from readiness", () => {
	expect(contrastRatio("#000000", "#ffffff")).toBe(21);
	expect(contrastRatio("#ffffff", "#ffffff")).toBe(1);
	expect(contrastRatio("invalid", "#ffffff")).toBeNull();
	const checks = pageReadiness(
		{
			displayName: "Creator",
			bio: "Hi",
			avatarUrl: null,
			theme: "default",
			accentColor: "#11110F",
		},
		[{ title: "Good", description: "Details", isActive: false }],
	);
	expect(checks.find((c) => c.id === "live")?.ok).toBe(false);
	expect(checks.find((c) => c.id === "accent")?.ok).toBe(false);
});
