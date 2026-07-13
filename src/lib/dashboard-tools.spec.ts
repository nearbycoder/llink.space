import { describe, expect, it } from "vitest";
import {
	buildAnalyticsCsv,
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

	it("summarizes live and paused links", () => {
		expect(dashboardLinkStats(links)).toEqual({ total: 2, live: 1, paused: 1 });
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
