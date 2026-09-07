import { expect, it } from "vitest";
import { duplicateBlock } from "./duplicate-block";

it("inserts an independent copy after the original and enforces limits", () => {
	const original = {
		id: "one",
		type: "text" as const,
		title: "Title",
		body: "Body",
		url: "",
		afterLinkId: null,
	};
	const result = duplicateBlock([original], "one", "two");
	expect(result.map((b) => b.id)).toEqual(["one", "two"]);
	result[1].title = "Changed";
	expect(original.title).toBe("Title");
	expect(() =>
		duplicateBlock(Array(30).fill(original), "one", "two"),
	).toThrow();
	expect(() => duplicateBlock([original], "one", "one")).toThrow();
});
