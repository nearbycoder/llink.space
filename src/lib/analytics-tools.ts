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

export function compareClicks(current: number, previous: number) {
	const delta = current - previous;
	return {
		delta,
		percent: previous === 0 ? null : Math.round((delta / previous) * 100),
	};
}
export function comparisonLabel(current: number, previous: number) {
	const { delta, percent } = compareClicks(current, previous);
	return percent === null
		? current > 0
			? "New activity"
			: "No change"
		: `${delta > 0 ? "+" : ""}${percent}%`;
}
