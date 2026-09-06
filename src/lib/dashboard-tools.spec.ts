import { describe, expect, it } from "vitest";
import {
	buildAnalyticsCsv,
	buildLinksCsv,
	dashboardLinkStats,
	filterDashboardLinks,
} from "./dashboard-tools";

const links = [
	{
		sectionId: null,
		title: "Portfolio",
		url: "https://example.com/work",
		description: "Selected projects",
		isActive: true,
	},
	{
		sectionId: "social",
		title: "Newsletter",
		url: "https://example.com/news",
		description: null,
		isActive: false,
	},
];

describe("dashboard link tools", () => {
	it("searches title, URL, and description", () => {
		expect(
			filterDashboardLinks(links, {
				query: "projects",
				status: "all",
				sectionId: "all",
			}),
		).toEqual([links[0]]);
	});

	it("filters link status and section", () => {
		expect(
			filterDashboardLinks(links, {
				query: "",
				status: "paused",
				sectionId: "social",
			}),
		).toEqual([links[1]]);
	});

	it("keeps scheduled and expired links out of live counts, filters and exports", () => {
		const scheduled = {
			...links[0],
			publishAt: new Date(Date.now() + 86400000).toISOString(),
		};
		const expired = {
			...links[0],
			expireAt: new Date(Date.now() - 86400000).toISOString(),
		};
		const rows = [...links, scheduled, expired];
		expect(dashboardLinkStats(rows)).toEqual({
			total: 4,
			live: 1,
			paused: 1,
			scheduled: 1,
			expired: 1,
		});
		expect(
			filterDashboardLinks(rows, {
				query: "",
				status: "live",
				sectionId: "all",
			}),
		).toEqual([links[0]]);
		expect(
			filterDashboardLinks(rows, {
				query: "",
				status: "scheduled",
				sectionId: "all",
			}),
		).toEqual([scheduled]);
		expect(buildLinksCsv([expired], [])).toContain(",Expired,");
	});
	it("summarizes live and paused links", () => {
		expect(dashboardLinkStats(links)).toEqual({
			total: 2,
			live: 1,
			paused: 1,
			scheduled: 0,
			expired: 0,
		});
	});
});

describe("analytics CSV", () => {
	it("exports summary, link, and referrer data with escaped cells", () => {
		const csv = buildAnalyticsCsv({
			totalClicks: 12,
			clicksLast24h: 4,
			clicksLast7d: 9,
			uniqueReferrers: 2,
			directClicks: 3,
			clicksByLink: [
				{ title: 'Guide, "new"', url: "https://example.com", count: 7 },
			],
			topReferrers: [{ source: "Direct", count: 3 }],
		});

		expect(csv).toContain('"Guide, ""new""",https://example.com,7');
		expect(csv).toContain("Direct,3");
	});
});

describe("links CSV", () => {
	it("exports link status and resolves section names", () => {
		const csv = buildLinksCsv(
			[
				{
					...links[0],
					sectionId: "featured",
					iconUrl: "website",
				},
				links[1],
			],
			[{ id: "featured", title: "Featured, work" }],
		);

		expect(csv).toContain(
			'Portfolio,https://example.com/work,Selected projects,"Featured, work",Live,website',
		);
		expect(csv).toContain("Newsletter,https://example.com/news,,,Paused,");
	});
});

describe("export safety and date range", () => {
	it.each([
		"=1+1",
		"+SUM(1)",
		"-1+1",
		"@SUM(1)",
		"  =1+1",
		"\t=1+1",
		"\r=1+1",
	])("escapes formula-like text: %s", (title) => {
		const csv = buildLinksCsv([{ ...links[0], title }], []);
		expect(csv.split("\r\n")[1]).toMatch(/^"?'/);
	});

	it("exports the selected UTC range and zero-filled daily data", () => {
		const csv = buildAnalyticsCsv({
			totalClicks: 3,
			clicksLast24h: 0,
			clicksLast7d: 3,
			uniqueReferrers: 1,
			directClicks: 0,
			clicksByLink: [],
			topReferrers: [],
			rangeDays: 7,
			rangeStart: "2026-08-31",
			rangeEnd: "2026-09-06",
			periodClicks: 3,
			clicksByDay: [{ day: "2026-09-06", count: 0 }],
		});
		expect(csv).toContain('"Range (days, UTC)",7');
		expect(csv).toContain("Start date (UTC),2026-08-31");
		expect(csv).toContain("Daily clicks (UTC)\r\nDate,Clicks\r\n2026-09-06,0");
	});
});
