import { expect, it } from "vitest";
import { publishingPreset } from "./publishing-presets";

it("uses local calendar days across month boundaries and clears the opposite date", () => {
	const now = new Date(2026, 0, 31, 22, 45);
	expect(publishingPreset("tomorrow", now)).toEqual({
		publishAt: "2026-02-01T09:00",
		expireAt: "",
	});
	expect(publishingPreset("week", now)).toEqual({
		publishAt: "",
		expireAt: "2026-02-07T22:45",
	});
	expect(publishingPreset("none", now)).toEqual({
		publishAt: "",
		expireAt: "",
	});
});
