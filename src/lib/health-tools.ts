import { csvCell } from "./dashboard-tools";
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

export function buildHealthCsv(
	links: Array<{
		title: string;
		url: string;
		healthState: string | null;
		healthStatusCode: number | null;
		healthFinalUrl: string | null;
		healthCheckedAt: string | Date | null;
	}>,
) {
	return [
		["Title", "URL", "Health", "HTTP status", "Final URL", "Checked at (UTC)"],
		...links.map((link) => [
			link.title,
			link.url,
			link.healthState ?? "unchecked",
			link.healthStatusCode,
			link.healthFinalUrl,
			link.healthCheckedAt ? new Date(link.healthCheckedAt).toISOString() : "",
		]),
	]
		.map((row) => row.map(csvCell).join(","))
		.join("\r\n");
}

/** Checked more than seven days ago, oldest first. Unchecked links have their own action. */
export function staleHealthLinks<
	T extends { id: string; healthCheckedAt: string | Date | null },
>(links: T[], now = Date.now()) {
	return links
		.filter(
			(link) =>
				link.healthCheckedAt &&
				new Date(link.healthCheckedAt).getTime() < now - 7 * 86400000,
		)
		.sort(
			(a, b) =>
				new Date(a.healthCheckedAt ?? 0).getTime() -
				new Date(b.healthCheckedAt ?? 0).getTime(),
		)
		.slice(0, 10);
}
