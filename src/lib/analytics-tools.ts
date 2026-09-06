/** Analytics timestamps and day buckets use UTC, independent of browser locale. */
export function analyticsRangeStart(days: number, now: Date) {
	const start = new Date(now);
	start.setUTCHours(0, 0, 0, 0);
	start.setUTCDate(start.getUTCDate() - days + 1);
	return start;
}

export function fillDailyClicks(
	rows: Array<{ day: string; count: number }>,
	days: number,
	now: Date,
) {
	const counts = new Map(rows.map((row) => [row.day, row.count]));
	const start = analyticsRangeStart(days, now);
	return Array.from({ length: days }, (_, index) => {
		const day = new Date(start.getTime() + index * 86400000)
			.toISOString()
			.slice(0, 10);
		return { day, count: counts.get(day) ?? 0 };
	});
}
