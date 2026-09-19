import { expect, it } from "vitest";
import { cleanLinkUrl } from "./clean-link-url";

it("removes attribution only, including repeated and mixed-case keys", () => {
	const result = cleanLinkUrl(
		"example.com/path?utm_source=x&utm_source=y&GCLID=z&product=42#details",
	);
	expect(result?.url).toBe("https://example.com/path?product=42#details");
	expect(result?.removed).toEqual(["utm_source", "GCLID"]);
	expect(cleanLinkUrl("javascript:alert(1)")).toBeNull();
	expect(cleanLinkUrl("example.com?token=keep")?.removed).toEqual([]);
});
