import { expect, it } from "vitest";
import { buildVcard } from "./vcard";

it("exports only public contact details with escaped text", () => {
	const card = buildVcard({
		name: "Alex; Doe",
		bio: "Hello\nEMAIL:injected@example.com",
		url: "https://example.com/alex",
	});
	expect(card).toContain("FN:Alex\\; Doe");
	expect(card).toContain("NOTE:Hello\\nEMAIL:injected@example.com");
	expect(card).not.toContain("\r\nEMAIL:");
	expect(card.endsWith("END:VCARD\r\n")).toBe(true);
});
it("folds Unicode safely and rejects unsafe profile URLs", () => {
	const card = buildVcard({
		name: "🌿".repeat(60),
		url: "https://example.com",
	});
	expect(
		card
			.split("\r\n")
			.every((line) => new TextEncoder().encode(line).length <= 75),
	).toBe(true);
	expect(card.replace(/\r\n /g, "")).toContain("FN:" + "🌿".repeat(60));
	expect(() => buildVcard({ name: "A", url: "javascript:alert(1)" })).toThrow();
});
