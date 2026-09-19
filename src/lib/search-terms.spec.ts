import { expect, it } from "vitest";
import { matchesSearch, searchTerms } from "./search-terms";

it("combines terms across fields while respecting phrases", () => {
	expect(
		matchesSearch(
			["Portfolio", "Selected projects"],
			searchTerms("portfolio projects"),
		),
	).toBe(true);
	expect(
		matchesSearch(
			["Portfolio", "Selected projects"],
			searchTerms('"selected projects" portfolio'),
		),
	).toBe(true);
	expect(
		matchesSearch(["Selected", "projects"], searchTerms('"selected projects"')),
	).toBe(false);
	expect(matchesSearch(["Portfolio"], searchTerms("portfolio missing"))).toBe(
		false,
	);
	expect(searchTerms('  ""  "UNFINISHED text')).toEqual(["unfinished", "text"]);
	expect(matchesSearch([], searchTerms(""))).toBe(true);
});
