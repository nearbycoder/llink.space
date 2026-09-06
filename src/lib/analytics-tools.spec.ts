import { describe, expect, it } from "vitest";
import {
	analyticsRangeStart,
	compareClicks,
	comparisonLabel,
	fillDailyClicks,
} from "./analytics-tools";

describe("UTC analytics days", () => {
	it("uses the same calendar boundary across browser offsets and year boundaries", () => {
		const now = new Date("2026-01-01T20:00:00-06:00");
		expect(analyticsRangeStart(7, now).toISOString()).toBe(
			"2025-12-27T00:00:00.000Z",
		);
	});

	it("fills missing days, including leap day, with zero clicks", () => {
		expect(
			fillDailyClicks(
				[{ day: "2024-02-29", count: 3 }],
				3,
				new Date("2024-03-01T14:00:00Z"),
			),
		).toEqual([
			{ day: "2024-02-28", count: 0 },
			{ day: "2024-02-29", count: 3 },
			{ day: "2024-03-01", count: 0 },
		]);
	});
});

describe("period comparisons", () => {
	it("handles gains, losses, and a zero baseline without infinity", () => {
		expect(compareClicks(15, 10)).toEqual({ delta: 5, percent: 50 });
		expect(compareClicks(0, 10)).toEqual({ delta: -10, percent: -100 });
		expect(compareClicks(5, 0)).toEqual({ delta: 5, percent: null });
		expect(comparisonLabel(0, 0)).toBe("No change");
	});
});
