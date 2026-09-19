import { expect, it } from "vitest";
import { filterHealthLinks } from "./health-tools";

it("combines health status with title, destination and redirect searches", () => {
	const links = [
		{
			id: "1",
			title: "Old shop",
			url: "https://old.example",
			healthState: "redirected",
			healthFinalUrl: "https://new.example",
		},
		{
			id: "2",
			title: "Notes",
			url: "https://notes.example",
			healthState: null,
			healthFinalUrl: null,
		},
	];
	expect(filterHealthLinks(links, "shop new.example", "redirected")).toEqual([
		links[0],
	]);
	expect(filterHealthLinks(links, "", "unchecked")).toEqual([links[1]]);
	expect(filterHealthLinks(links, "shop", "healthy")).toEqual([]);
});
