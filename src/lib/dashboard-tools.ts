export type LinkStatusFilter = "all" | "live" | "paused";

export interface FilterableDashboardLink {
	sectionId: string | null;
	title: string;
	url: string;
	description: string | null;
	isActive: boolean | null;
}

export function filterDashboardLinks<T extends FilterableDashboardLink>(
	links: T[],
	filters: {
		query: string;
		status: LinkStatusFilter;
		sectionId: string;
	},
) {
	const query = filters.query.trim().toLocaleLowerCase();

	return links.filter((link) => {
		const matchesQuery =
			!query ||
			[link.title, link.url, link.description ?? ""].some((value) =>
				value.toLocaleLowerCase().includes(query),
			);
		const matchesStatus =
			filters.status === "all" ||
			(filters.status === "live"
				? link.isActive !== false
				: link.isActive === false);
		const matchesSection =
			filters.sectionId === "all" ||
			(filters.sectionId === "unsectioned"
				? link.sectionId === null
				: link.sectionId === filters.sectionId);

		return matchesQuery && matchesStatus && matchesSection;
	});
}

export function dashboardLinkStats(links: FilterableDashboardLink[]) {
	const live = links.filter((link) => link.isActive !== false).length;
	return {
		total: links.length,
		live,
		paused: links.length - live,
	};
}

function csvCell(value: unknown) {
	const normalized = value == null ? "" : String(value);
	return /[",\n\r]/.test(normalized)
		? `"${normalized.replaceAll('"', '""')}"`
		: normalized;
}

export interface AnalyticsCsvSummary {
	totalClicks: number;
	clicksLast24h: number;
	clicksLast7d: number;
	uniqueReferrers: number;
	directClicks: number;
	clicksByLink: Array<{
		title: string | null;
		url: string | null;
		count: number;
	}>;
	topReferrers: Array<{ source: string; count: number }>;
}

export function buildAnalyticsCsv(summary: AnalyticsCsvSummary) {
	const rows: unknown[][] = [
		["Analytics summary"],
		["Metric", "Value"],
		["Total clicks", summary.totalClicks],
		["Last 24 hours", summary.clicksLast24h],
		["Last 7 days", summary.clicksLast7d],
		["Traffic sources", summary.uniqueReferrers],
		["Direct clicks", summary.directClicks],
		[],
		["Clicks by link"],
		["Title", "URL", "Clicks"],
		...summary.clicksByLink.map((link) => [
			link.title ?? "Untitled link",
			link.url ?? "",
			link.count,
		]),
		[],
		["Referrer sources"],
		["Source", "Clicks"],
		...summary.topReferrers.map((source) => [source.source, source.count]),
	];

	return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
