import { expect, it } from "vitest";
import {
	buildHealthCsv,
	filterHealthLinks,
	staleHealthLinks,
} from "./health-tools";

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

it("exports health details and protects spreadsheet cells", () => {
	const csv = buildHealthCsv([
		{
			title: "=FORMULA()",
			url: "https://example.com",
			healthState: "redirected",
			healthStatusCode: 301,
			healthFinalUrl: "https://example.org",
			healthCheckedAt: "2026-09-19T12:00:00.000Z",
		},
	]);
	expect(csv).toContain("'=FORMULA()");
	expect(csv).toContain(
		"redirected,301,https://example.org,2026-09-19T12:00:00.000Z",
	);
});

it("selects at most ten stale checks oldest first, excluding unchecked and invalid dates", () => {
	const now = Date.parse("2026-09-19T12:00:00Z");
	const links = Array.from({ length: 15 }, (_, i) => ({
		id: String(i),
		healthCheckedAt: new Date(now - (i + 1) * 86400000),
	}));
	expect(
		staleHealthLinks(
			[
				...links,
				{ id: "unchecked", healthCheckedAt: null },
				{ id: "invalid", healthCheckedAt: new Date(NaN) },
			],
			now,
		).map((l) => l.id),
	).toEqual(["14", "13", "12", "11", "10", "9", "8", "7"]);
	expect(
		staleHealthLinks(
			Array.from({ length: 15 }, (_, i) => ({
				id: String(i),
				healthCheckedAt: new Date(now - 20 * 86400000),
			})),
			now,
		),
	).toHaveLength(10);
});
