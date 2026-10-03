import { normalizeHttpUrl } from "./security";
export const EXTENDED_BLOCK_HELP = {
	audio:
		"Use a direct MP3, M4A, AAC, OGG, WAV, FLAC or WebM URL. Playback starts only when a visitor presses play.",
	button:
		"A prominent call to action with a website destination and optional supporting text.",
	divider: "Separate content with a quiet line and an optional label.",
	code: "Share plain code as text. Visitors can copy it; code is never executed.",
	checklist:
		"One item per line: - [ ] To do or - [x] Done. Visitors can check items for this visit.",
	hours:
		"One day per line: Monday | 09:00-17:00 or Sunday | Closed. Use 24-hour times; split overnight hours across two days.",
} as const;
export function audioUrl(value: string) {
	const url = normalizeHttpUrl(value);
	return url &&
		/\.(mp3|m4a|aac|ogg|wav|flac|webm)$/i.test(new URL(url).pathname)
		? url
		: null;
}
export function parseChecklist(body: string) {
	const lines = body.split(/\r?\n/).filter((l) => l.trim());
	if (!lines.length || lines.length > 30) return null;
	const rows = lines.map((line) => {
		const match = line.trim().match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
		return match
			? { checked: match[1].toLowerCase() === "x", label: match[2].trim() }
			: null;
	});
	return rows.every((r) => r !== null) ? rows : null;
}
const DAYS = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
];
export function parseBusinessHours(body: string) {
	const lines = body.split(/\r?\n/).filter((l) => l.trim());
	if (!lines.length || lines.length > 7) return null;
	const rows: Array<{ day: string; hours: string }> = [];
	for (const line of lines) {
		const pieces = line.split("|");
		if (pieces.length !== 2) return null;
		const day = DAYS.find(
			(d) => d.toLowerCase() === pieces[0].trim().toLowerCase(),
		);
		const hours = pieces[1].trim();
		if (!day || rows.some((r) => r.day === day)) return null;
		if (!/^closed$/i.test(hours)) {
			const match = hours.match(
				/^([0-2]\d:[0-5]\d)\s*[-–]\s*([0-2]\d:[0-5]\d)$/,
			);
			if (
				!match ||
				match[1].slice(0, 2) > "23" ||
				match[2].slice(0, 2) > "23" ||
				match[1] >= match[2]
			)
				return null;
			rows.push({ day, hours: `${match[1]}–${match[2]}` });
		} else rows.push({ day, hours: "Closed" });
	}
	return rows.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day));
}
export function validTimeZone(value: string) {
	try {
		new Intl.DateTimeFormat("en", { timeZone: value });
		return true;
	} catch {
		return false;
	}
}
