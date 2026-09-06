import { describe, expect, it } from "vitest";
import { parseLinkImport } from "./link-import";

describe("pasted link import", () => {
	it("normalizes websites, accepts spreadsheet titles, and skips existing and repeated URLs", () => {
		const result = parseLinkImport(
			"example.com\r\nhttps://example.com/\nnews.example.com\tMy newsletter\n\nold.example.com",
			["https://old.example.com/"],
		);
		expect(result.links).toEqual([
			{ title: "example.com", url: "https://example.com/" },
			{ title: "My newsletter", url: "https://news.example.com/" },
		]);
		expect(result.duplicates).toBe(2);
		expect(result.errors).toEqual([]);
	});

	it("reports original line numbers for unsafe or malformed input", () => {
		const result = parseLinkImport(
			"\njavascript:alert(1)\nhttps://user:password@example.com\nnot a url",
		);
		expect(result.links).toEqual([]);
		expect(result.errors.map((error) => error.line)).toEqual([2, 3, 4]);
	});

	it("rejects oversized batches and titles", () => {
		expect(
			parseLinkImport(
				Array.from({ length: 51 }, (_, i) => `example.com/${i}`).join("\n"),
			).errors[0].message,
		).toContain("50");
		expect(
			parseLinkImport(`example.com\t${"a".repeat(101)}`).errors,
		).toHaveLength(1);
	});
});
