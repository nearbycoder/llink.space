import { expect, it } from "vitest";
import { buildCalendar, publishingEntries } from "./calendar-export";

it("filters and orders publishing milestones, including paused status", () => {
	const now = Date.parse("2026-01-01T00:00:00Z");
	expect(
		publishingEntries(
			[
				{
					id: "a",
					title: "A",
					url: "https://example.com",
					isActive: false,
					publishAt: "2026-01-02T00:00:00Z",
					expireAt: "2027-01-01T00:00:00Z",
				},
			],
			7,
			now,
		).map((e) => e.title),
	).toEqual(["Paused · Starts: A"]);
});
it("escapes iCalendar content, converts zones, and folds Unicode safely", () => {
	const text = buildCalendar(
		[
			{
				id: "x",
				title: "Event;\nBEGIN:BAD",
				start: "2026-01-01T12:00:00-06:00",
				description: "🎉".repeat(60),
			},
		],
		new Date("2026-01-01"),
	);
	expect(text).toContain("DTSTART:20260101T180000Z");
	expect(text).toContain("SUMMARY:Event\\;\\nBEGIN:BAD");
	expect(text).not.toContain("\r\nBEGIN:BAD");
	for (const line of text.split("\r\n"))
		expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
	expect(() =>
		buildCalendar([{ id: "x", title: "x", start: "bad" }]),
	).toThrow();
});
