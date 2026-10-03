export const WEEKDAYS = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
];
export function fillClickHeatmap(
	rows: Array<{ weekday: number; hour: number; count: number }>,
) {
	const counts = new Map(rows.map((r) => [`${r.weekday}-${r.hour}`, r.count]));
	return WEEKDAYS.flatMap((day, index) =>
		Array.from({ length: 24 }, (_, hour) => ({
			day,
			weekday: index + 1,
			hour,
			count: counts.get(`${index + 1}-${hour}`) ?? 0,
		})),
	);
}
export function summarizeDevices(
	rows: Array<{ device: string; count: number }>,
) {
	const total = rows.reduce((sum, r) => sum + r.count, 0);
	return ["Mobile", "Desktop", "Tablet", "Unknown"].map((device) => {
		const count = rows.find((r) => r.device === device)?.count ?? 0;
		return {
			device,
			count,
			percent: total ? Math.round((count / total) * 100) : 0,
		};
	});
}
