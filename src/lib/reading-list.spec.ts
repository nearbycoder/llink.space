import { expect, it } from "vitest";
import { readingListKey, readSavedLinks } from "./reading-list";

it("ignores corrupt storage, duplicates, and unpublished links", () => {
	expect(readSavedLinks("bad", ["a"])).toEqual([]);
	expect(readSavedLinks("{}", ["a"])).toEqual([]);
	expect(readSavedLinks('["a","a","removed",null,3]', ["a", "b"])).toEqual([
		"a",
	]);
	expect(readingListKey("one")).not.toBe(readingListKey("two"));
});
it("caps stored selections", () => {
	const ids = Array.from({ length: 600 }, (_, i) => String(i));
	expect(readSavedLinks(JSON.stringify(ids), ids)).toHaveLength(500);
});
