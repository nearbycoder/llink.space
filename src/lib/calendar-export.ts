import { normalizeHttpUrl } from "./security";
export interface CalendarEntry {
	id: string;
	title: string;
	start: string;
	end?: string;
	description?: string;
	url?: string;
}
const calendarText = (s: string) =>
	s
		.replace(/\\/g, "\\\\")
		.replace(/\r?\n/g, "\\n")
		.replace(/[,;]/g, "\\$&")
		.replace(/\r/g, "");
const stamp = (s: string) => {
	const d = new Date(s);
	if (!Number.isFinite(d.getTime())) throw new Error("Invalid calendar date");
	return d
		.toISOString()
		.replace(/[-:]/g, "")
		.replace(/\.\d{3}/, "");
};
function fold(line: string) {
	const rows: string[] = [];
	let part = "",
		bytes = 0;
	for (const c of line) {
		const size = new TextEncoder().encode(c).length;
		if (bytes + size > 75) {
			rows.push(part);
			part = " ";
			bytes = 1;
		}
		part += c;
		bytes += size;
	}
	rows.push(part);
	return rows.join("\r\n");
}
export function buildCalendar(entries: CalendarEntry[], now = new Date()) {
	const rows = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//llink.space//Calendar//EN",
		"CALSCALE:GREGORIAN",
	];
	for (const e of entries) {
		if (e.end && new Date(e.end) <= new Date(e.start))
			throw new Error("End must follow start");
		rows.push(
			"BEGIN:VEVENT",
			`UID:${calendarText(e.id)}@llink.space`,
			`DTSTAMP:${stamp(now.toISOString())}`,
			`DTSTART:${stamp(e.start)}`,
			...(e.end ? [`DTEND:${stamp(e.end)}`] : []),
			`SUMMARY:${calendarText(e.title)}`,
			...(e.description ? [`DESCRIPTION:${calendarText(e.description)}`] : []),
			...(e.url && normalizeHttpUrl(e.url)
				? [`URL:${normalizeHttpUrl(e.url)}`]
				: []),
			"END:VEVENT",
		);
	}
	return [...rows, "END:VCALENDAR"].map(fold).join("\r\n") + "\r\n";
}
export function publishingEntries(
	links: Array<{
		id: string;
		title: string;
		url: string;
		isActive: boolean | null;
		publishAt?: string | null;
		expireAt?: string | null;
	}>,
	days: number,
	now = Date.now(),
): CalendarEntry[] {
	return links
		.flatMap((l) =>
			(
				[
					["publish", l.publishAt],
					["expire", l.expireAt],
				] as const
			).flatMap(([kind, date]) =>
				date &&
				new Date(date).getTime() >= now &&
				new Date(date).getTime() <= now + days * 86400000
					? [
							{
								id: `${l.id}-${kind}`,
								title: `${l.isActive === false ? "Paused · " : ""}${kind === "publish" ? "Starts" : "Expires"}: ${l.title}`,
								start: date,
								url: l.url,
								description:
									l.isActive === false
										? "This link is paused. Its schedule will not make it public until you publish it."
										: "Publishing schedule for your llink.space page.",
							},
						]
					: [],
			),
		)
		.sort(
			(a, b) =>
				Date.parse(a.start) - Date.parse(b.start) || a.id.localeCompare(b.id),
		);
}
