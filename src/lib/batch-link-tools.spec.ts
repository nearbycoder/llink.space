import { describe, expect, it } from "vitest";
import { batchOperationSchema, previewBatchLinks } from "./batch-link-tools";

const link = {
	id: "a",
	title: "Launch Launch",
	url: "https://example.com/path?utm_source=ig&id=42#details",
	description: "Original",
	iconUrl: "globe",
	iconBgColor: "#ffffff",
	isActive: true,
	publishAt: null,
	expireAt: null,
};
describe("batch link edits", () => {
	it("previews literal replacements and skips unchanged rows", () => {
		const rows = previewBatchLinks(
			[link, { ...link, id: "b", title: "News" }],
			{ kind: "title", find: "Launch", replacement: "Release" },
		);
		expect(rows.map((r) => r.changed)).toEqual([true, false]);
		expect(rows[0].after.title).toBe("Release Release");
		expect(link.title).toBe("Launch Launch");
	});
	it("rejects an entire preview if one title becomes empty or too long", () => {
		expect(() =>
			previewBatchLinks([link], {
				kind: "title",
				find: "Launch Launch",
				replacement: "",
			}),
		).toThrow("empty title");
		expect(() =>
			previewBatchLinks([link], {
				kind: "title",
				find: "Launch",
				replacement: "x".repeat(100),
			}),
		).toThrow("100");
	});
	it("does not allow unsafe or oversized replacement destinations", () => {
		expect(() =>
			previewBatchLinks([link], {
				kind: "url",
				find: "https://",
				replacement: "javascript:",
			}),
		).toThrow("invalid destination");
		expect(() =>
			previewBatchLinks([link], {
				kind: "url",
				find: "path",
				replacement: "x".repeat(2048),
			}),
		).toThrow("invalid destination");
	});
	it("cleans tracking in bulk and preserves destination parameters and fragments", () => {
		const row = previewBatchLinks([link], { kind: "clean" })[0];
		expect(row.after.url).toBe("https://example.com/path?id=42#details");
	});
	it("validates complete schedules and makes activation explicit", () => {
		expect(
			batchOperationSchema.safeParse({
				kind: "schedule",
				publishAt: "2026-12-03T00:00:00Z",
				expireAt: "2026-12-02T00:00:00Z",
				activate: true,
			}).success,
		).toBe(false);
		const paused = {
			...link,
			isActive: false,
			publishAt: "2026-12-01T00:00:00Z",
		};
		expect(
			previewBatchLinks([paused], {
				kind: "schedule",
				publishAt: null,
				expireAt: null,
				activate: false,
			})[0].after.isActive,
		).toBe(false);
		expect(
			previewBatchLinks([paused], {
				kind: "schedule",
				publishAt: null,
				expireAt: null,
				activate: true,
			})[0].after.isActive,
		).toBe(true);
	});
	it("duplicates as paused unscheduled drafts within the title limit", () => {
		const row = previewBatchLinks(
			[{ ...link, title: "x".repeat(100), publishAt: "2026-12-01T00:00:00Z" }],
			{ kind: "duplicate" },
		)[0];
		expect(row.after.title).toHaveLength(100);
		expect(row.after.isActive).toBe(false);
		expect(row.after.publishAt).toBeNull();
		expect(row.changed).toBe(true);
	});
	it("validates styles and clears descriptions intentionally", () => {
		expect(
			batchOperationSchema.safeParse({
				kind: "style",
				iconUrl: "fake",
				iconBgColor: "red",
			}).success,
		).toBe(false);
		expect(
			previewBatchLinks([link], { kind: "description", description: "" })[0]
				.after.description,
		).toBeNull();
	});
});
