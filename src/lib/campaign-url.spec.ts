import { describe, expect, it } from "vitest";
import { buildCampaignUrl, readCampaign } from "./campaign-url";

describe("campaign URLs", () => {
	it("preserves fragments and unrelated parameters while replacing campaign values", () => {
		const fields = readCampaign(
			"https://example.com/?utm_source=old&keep=yes#work",
		);
		const result = new URL(
			buildCampaignUrl("https://example.com/?utm_source=old&keep=yes#work", {
				...fields,
				source: "new source",
				medium: "social",
			}),
		);
		expect(result.searchParams.get("utm_source")).toBe("new source");
		expect(result.searchParams.get("keep")).toBe("yes");
		expect(result.hash).toBe("#work");
		expect(
			buildCampaignUrl(result.href, { ...fields, source: "" }),
		).not.toContain("utm_source");
	});
	it("rejects unsafe and oversized destinations", () => {
		expect(() =>
			buildCampaignUrl("javascript:alert(1)", readCampaign("")),
		).toThrow();
		expect(() =>
			buildCampaignUrl("https://example.com", {
				...readCampaign(""),
				source: "x".repeat(201),
			}),
		).toThrow();
	});
});
