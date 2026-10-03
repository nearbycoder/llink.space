// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { buildBookmarks } from "./bookmark-export";
import {
	bookmarkLinksToText,
	buildLinkCatalog,
	parseLinkCatalog,
} from "./link-catalog";
import { parseLinkImport } from "./link-import";

const row = {
	title: "Studio & <work>",
	url: "https://example.com/?id=1&mode=2",
	description: "Latest work",
	iconUrl: "globe",
	iconBgColor: "#aabbcc",
	sectionId: "s",
};
describe("link catalog exchange", () => {
	it("round trips editable fields, excludes private IDs and tolerates section annotations", () => {
		const source = buildLinkCatalog([row], [{ id: "s", title: "Work" }]);
		expect(source).not.toContain('"sectionId"');
		expect(source).toContain('"section": "Work"');
		expect(parseLinkCatalog(source).links[0]).toEqual({
			title: row.title,
			url: row.url,
			description: row.description,
			iconUrl: row.iconUrl,
			iconBgColor: row.iconBgColor,
		});
	});
	it("accepts simple arrays and skips normalized duplicates", () => {
		const result = parseLinkCatalog(
			JSON.stringify([
				{ title: "Site", url: "https://example.com" },
				{ title: "Again", url: "https://example.com/" },
			]),
			["https://example.com/"],
		);
		expect(result).toEqual({ links: [], duplicates: 2 });
	});
	it("rejects malformed, future, oversized, unsafe and excessive imports", () => {
		for (const source of [
			"{",
			'{"version":2,"links":[]}',
			JSON.stringify([{ title: "", url: "https://example.com" }]),
			JSON.stringify([{ title: "Bad", url: "javascript:alert(1)" }]),
			JSON.stringify(Array(51).fill(row)),
			JSON.stringify([
				{ title: "Encoded URL", url: `https://example.com/${"ü".repeat(500)}` },
			]),
		])
			expect(() => parseLinkCatalog(source)).toThrow();
		expect(() => parseLinkCatalog("ü".repeat(128_001))).toThrow("256 KB");
	});
	it("round trips actual browser bookmark exports with escaped text and URLs", () => {
		const source = buildBookmarks([row], [{ id: "s", title: "Work" }]);
		const result = parseLinkImport(bookmarkLinksToText(source));
		expect(result.errors).toEqual([]);
		expect(result.links).toEqual([{ title: row.title, url: row.url }]);
	});
	it("rejects non-bookmark files, unsafe schemes and too many anchors", () => {
		for (const source of [
			"<h1>hello</h1>",
			'<dl><a href="javascript:alert(1)">Bad</a></dl>',
			`<dl>${Array(51).fill('<a href="https://example.com">Link</a>').join("")}</dl>`,
		])
			expect(() => bookmarkLinksToText(source)).toThrow();
	});
});
