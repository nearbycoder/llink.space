import { localDateInput } from "./link-publishing";
export type PublishingPreset = "tomorrow" | "week" | "none";
export function publishingPreset(preset: PublishingPreset, now = new Date()) {
	const date = new Date(now);
	if (preset === "tomorrow") {
		date.setDate(date.getDate() + 1);
		date.setHours(9, 0, 0, 0);
		return { publishAt: localDateInput(date.toISOString()), expireAt: "" };
	}
	if (preset === "week") {
		date.setDate(date.getDate() + 7);
		return { publishAt: "", expireAt: localDateInput(date.toISOString()) };
	}
	return { publishAt: "", expireAt: "" };
}
