import { matchesSearch, searchTerms } from "./search-terms";
export const HEALTH_STATES = [
	"unchecked",
	"healthy",
	"redirected",
	"broken",
	"restricted",
	"blocked",
	"unreachable",
	"redirect-loop",
] as const;
export function filterHealthLinks<
	T extends {
		title: string;
		url: string;
		healthState: string | null;
		healthFinalUrl: string | null;
	},
>(links: T[], query: string, state: string) {
	const terms = searchTerms(query);
	return links.filter(
		(link) =>
			(state === "all" || (link.healthState ?? "unchecked") === state) &&
			matchesSearch([link.title, link.url, link.healthFinalUrl ?? ""], terms),
	);
}
