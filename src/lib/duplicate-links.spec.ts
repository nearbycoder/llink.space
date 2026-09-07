import { expect, it } from "vitest";
import { duplicateDestinations } from "./duplicate-links";

it("ignores tracking and query order but retains meaningful queries and fragments", () => {
	const links = [
		{ id: "1", url: "https://example.com/?b=2&a=1&utm_source=one" },
		{ id: "2", url: "https://EXAMPLE.com/?a=1&b=2&fbclid=x" },
		{ id: "3", url: "https://example.com/?a=2&b=2" },
		{ id: "4", url: "https://example.com/?a=1&b=2#other" },
	];
	expect(
		duplicateDestinations(links).map((g) => g.links.map((l) => l.id)),
	).toEqual([["1", "2"]]);
	expect(duplicateDestinations([{ id: "bad", url: "javascript:1" }])).toEqual(
		[],
	);
});
