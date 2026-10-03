import { expect, it } from "vitest";
import { fillClickHeatmap, summarizeDevices } from "./traffic-insights";

it("fills all 168 weekday/hour buckets without losing counts", () => {
	const cells = fillClickHeatmap([
		{ weekday: 1, hour: 0, count: 2 },
		{ weekday: 7, hour: 23, count: 4 },
	]);
	expect(cells).toHaveLength(168);
	expect(cells[0]).toMatchObject({ day: "Monday", count: 2 });
	expect(cells[167]).toMatchObject({ day: "Sunday", count: 4 });
	expect(cells.reduce((s, r) => s + r.count, 0)).toBe(6);
});
it("keeps missing devices and empty ranges explicit", () => {
	expect(
		summarizeDevices([]).every((d) => d.count === 0 && d.percent === 0),
	).toBe(true);
	expect(
		summarizeDevices([
			{ device: "Mobile", count: 3 },
			{ device: "Desktop", count: 1 },
		])[0],
	).toEqual({ device: "Mobile", count: 3, percent: 75 });
});
