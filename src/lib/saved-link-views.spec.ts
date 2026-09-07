import { expect, it } from "vitest";
import { readLinkViews } from "./saved-link-views";

it("validates browser data and handles corrupt storage safely", () => {
	const view = {
		name: "Work",
		query: "portfolio",
		status: "live",
		sectionId: "all",
	};
	expect(readLinkViews(JSON.stringify([view]))).toEqual([view]);
	expect(readLinkViews("bad")).toEqual([]);
	expect(
		readLinkViews(JSON.stringify([{ ...view, status: "invalid" }])),
	).toEqual([]);
	expect(readLinkViews(JSON.stringify(Array(11).fill(view)))).toEqual([]);
});
