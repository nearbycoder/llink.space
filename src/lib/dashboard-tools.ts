import { publishingStatus } from "./link-publishing";

export type LinkStatusFilter =
	| "all"
	| "live"
	| "paused"
	| "scheduled"
	| "expired";

export interface FilterableDashboardLink {
	sectionId: string | null;
	title: string;
	url: string;
	description: string | null;
	isActive: boolean | null;
	publishAt?: string | null;
	expireAt?: string | null;
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
			publishingStatus(link).toLowerCase() === filters.status;
		const matchesSection =
			filters.sectionId === "all" ||
			(filters.sectionId === "unsectioned"
				? link.sectionId === null
				: link.sectionId === filters.sectionId);

		return matchesQuery && matchesStatus && matchesSection;
	});
}

export function dashboardLinkStats(links: FilterableDashboardLink[]) {
	const stats = {
		total: links.length,
		live: 0,
		paused: 0,
		scheduled: 0,
		expired: 0,
	};
	for (const link of links) {
		const status = publishingStatus(link).toLowerCase() as Exclude<
			LinkStatusFilter,
			"all"
		>;
		stats[status]++;
	}
	return stats;
}

export function csvCell(value: unknown) {
	const raw = value == null ? "" : String(value);
	// Prevent user-controlled cells from being interpreted as spreadsheet formulas.
	const normalized =
		// biome-ignore lint/suspicious/noControlCharactersInRegex: Strip spreadsheet formula prefixes even after control characters.
		typeof value === "string" && /^[\s\u0000-\u001f]*[=+@-]|^[\t\r\n]/.test(raw)
			? `'${raw}`
			: raw;
	return /[",\n\r]/.test(normalized)
		? `"${normalized.replaceAll('"', '""')}"`
		: normalized;
}

export interface AnalyticsCsvSummary {
	rangeDays?: number;
	rangeStart?: string;
	rangeEnd?: string;
	periodClicks?: number;
	previousPeriodClicks?: number;
	clicksByDay?: Array<{ day: string; count: number }>;
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
		["Range (days, UTC)", summary.rangeDays ?? ""],
		["Start date (UTC)", summary.rangeStart ?? ""],
		["End date (UTC)", summary.rangeEnd ?? ""],
		["Selected period clicks", summary.periodClicks ?? ""],
		["Previous period clicks", summary.previousPeriodClicks ?? ""],
		["Total clicks", summary.totalClicks],
		["Last 24 hours", summary.clicksLast24h],
		["Last 7 days", summary.clicksLast7d],
		["Traffic sources", summary.uniqueReferrers],
		["Direct clicks", summary.directClicks],
		[],
		["Daily clicks (UTC)"],
		["Date", "Clicks"],
		...(summary.clicksByDay ?? []).map((day) => [day.day, day.count]),
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

export interface ExportableDashboardLink extends FilterableDashboardLink {
	iconUrl?: string | null;
}

export function buildLinksCsv(
	links: ExportableDashboardLink[],
	sections: Array<{ id: string; title: string }>,
) {
	const sectionTitles = new Map(
		sections.map((section) => [section.id, section.title]),
	);
	const rows: unknown[][] = [
		["Title", "URL", "Description", "Section", "Status", "Icon"],
		...links.map((link) => [
			link.title,
			link.url,
			link.description ?? "",
			link.sectionId
				? (sectionTitles.get(link.sectionId) ?? "")
				: "Unsectioned",
			publishingStatus(link),
			link.iconUrl ?? "",
		]),
	];

	return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
