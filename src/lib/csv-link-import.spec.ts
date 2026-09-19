import { describe, expect, it } from "vitest";
import { csvLinksToText } from "./csv-link-import";
import { parseLinkImport } from "./link-import";

describe("CSV link import", () => {
	it("reads exported headers, quoted commas, escaped quotes and multiline titles", () => {
		const result = csvLinksToText(
			'\uFEFFTitle,URL,Description\r\n"Hello, ""world""",https://example.com,ignored\r\n"Two\nlines",https://example.org,',
		);
		expect(parseLinkImport(result).links).toEqual([
			{ title: 'Hello, "world"', url: "https://example.com/" },
			{ title: "Two lines", url: "https://example.org/" },
		]);
	});
	it("rejects malformed and oversized files and preserves URL validation", () => {
		expect(() => csvLinksToText("Name,Address\nSite,example.com")).toThrow(
			"URL column",
		);
		expect(() => csvLinksToText('URL\n"unclosed')).toThrow("unclosed");
		expect(() =>
			csvLinksToText(
				"URL\n" + Array(51).fill("https://example.com").join("\n"),
			),
		).toThrow("50");
		expect(
			parseLinkImport(csvLinksToText("URL\njavascript:alert(1)")).errors,
		).toHaveLength(1);
	});
});
