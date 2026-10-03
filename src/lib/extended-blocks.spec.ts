import { describe, expect, it } from "vitest";
import {
	audioUrl,
	parseBusinessHours,
	parseChecklist,
	validTimeZone,
} from "./extended-blocks";
import { contentBlockSchema } from "./page-design";

const base = {
	id: "0e53bd53-b32a-4101-9b5c-1eb0b24e6b41",
	title: "Block",
	body: "",
	url: "",
	afterLinkId: null,
};
describe("extended public content", () => {
	it("requires supported audio URLs and a title", () => {
		expect(audioUrl("https://example.com/episode.MP3?token=abc")).toBe(
			"https://example.com/episode.MP3?token=abc",
		);
		for (const url of [
			"javascript:alert(1)",
			"https://example.com/embed",
			"https://example.com/track.svg",
		])
			expect(audioUrl(url)).toBeNull();
		expect(
			contentBlockSchema.safeParse({
				...base,
				type: "audio",
				url: "https://example.com/track.mp3",
			}).success,
		).toBe(true);
	});
	it("validates button destinations and code content", () => {
		expect(
			contentBlockSchema.safeParse({
				...base,
				type: "button",
				url: "javascript:alert(1)",
			}).success,
		).toBe(false);
		expect(
			contentBlockSchema.safeParse({ ...base, type: "code" }).success,
		).toBe(false);
		expect(
			contentBlockSchema.safeParse({
				...base,
				type: "code",
				body: '<script>alert("text")</script>',
			}).success,
		).toBe(true);
		expect(
			contentBlockSchema.safeParse({ ...base, title: "", type: "divider" })
				.success,
		).toBe(true);
	});
	it("reads checked and unchecked items and bounds checklist length", () => {
		expect(parseChecklist("- [ ] First\n- [X] Done")).toEqual([
			{ checked: false, label: "First" },
			{ checked: true, label: "Done" },
		]);
		expect(parseChecklist("- [ ]")).toBeNull();
		expect(parseChecklist(Array(31).fill("- [ ] Item").join("\n"))).toBeNull();
	});
	it("sorts unique weekdays, normalizes closed and rejects invalid or overnight times", () => {
		expect(parseBusinessHours("Sunday | closed\nMonday | 09:00-17:00")).toEqual(
			[
				{ day: "Monday", hours: "09:00–17:00" },
				{ day: "Sunday", hours: "Closed" },
			],
		);
		for (const body of [
			"Monday | 24:00-25:00",
			"Monday | 22:00-02:00",
			"Monday | 09:00-09:00",
			"Monday | Closed\nMonday | Closed",
			"Friday | anytime",
		])
			expect(parseBusinessHours(body)).toBeNull();
	});
	it("requires a known time zone for business hours", () => {
		expect(validTimeZone("America/Chicago")).toBe(true);
		expect(validTimeZone("Mars/Studio")).toBe(false);
		expect(
			contentBlockSchema.safeParse({
				...base,
				type: "hours",
				body: "Monday | Closed",
			}).success,
		).toBe(false);
		expect(
			contentBlockSchema.safeParse({
				...base,
				type: "hours",
				body: "Monday | Closed",
				timeZone: "America/Chicago",
			}).success,
		).toBe(true);
	});
});
