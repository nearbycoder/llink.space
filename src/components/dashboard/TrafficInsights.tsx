import { Download } from "lucide-react";
import { Button } from "#/components/ui/button";
import { downloadFile } from "#/lib/download-file";
import { WEEKDAYS } from "#/lib/traffic-insights";
import { useClientReady } from "#/lib/use-client-ready";
export function TrafficInsights({
	devices,
	heatmap,
	days,
}: {
	devices: Array<{ device: string; count: number; percent: number }>;
	heatmap: Array<{ day: string; weekday: number; hour: number; count: number }>;
	days: number;
}) {
	const ready = useClientReady();
	const max = Math.max(0, ...heatmap.map((r) => r.count));
	const peak = max ? heatmap.find((r) => r.count === max) : null;
	return (
		<div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_2fr]">
			<section
				className="kinetic-panel flex min-w-0 flex-col gap-5 p-5"
				aria-label="Clicks by device"
			>
				<div>
					<h2 className="text-base font-semibold">Clicks by device</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						Last {days} days · estimated from browser information
					</p>
				</div>
				<dl className="flex flex-col gap-5">
					{devices.map((d) => (
						<div key={d.device}>
							<div className="mb-2 flex justify-between gap-3 text-sm">
								<dt>{d.device}</dt>
								<dd className="tabular-nums">
									{d.count}{" "}
									<span className="text-muted-foreground">· {d.percent}%</span>
								</dd>
							</div>
							<div
								className="h-1.5 overflow-hidden rounded-full bg-muted"
								aria-hidden="true"
							>
								<div
									className="h-full rounded-full bg-primary"
									style={{ width: `${d.percent}%` }}
								/>
							</div>
						</div>
					))}
				</dl>
				<Button
					size="sm"
					disabled={!ready}
					variant="outline"
					onClick={() =>
						downloadFile(
							`Device,Clicks,Percent\n${devices.map((d) => `${d.device},${d.count},${d.percent}`).join("\n")}`,
							`llink-devices-${days}d.csv`,
							"text/csv",
						)
					}
				>
					<Download data-icon="inline-start" /> Export device data
				</Button>
			</section>
			<section
				className="kinetic-panel flex min-w-0 flex-col gap-5 p-5"
				aria-label="Weekly click heatmap"
			>
				<div>
					<h2 className="text-base font-semibold">When people click</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						Clicks by weekday and hour · last {days} days · UTC
					</p>
				</div>
				<div className="relative overflow-x-auto pb-2">
					<table className="w-full min-w-[440px] table-fixed border-separate border-spacing-1 text-xs">
						<caption className="sr-only">
							Click counts for every weekday and hour in UTC
						</caption>
						<thead>
							<tr>
								<th scope="col" className="w-12 text-left">
									Day
								</th>
								{Array.from({ length: 24 }, (_, h) => h).map((hour) => (
									<th
										scope="col"
										key={hour}
										className="text-center font-normal text-muted-foreground"
									>
										<span className={hour % 6 === 0 ? "" : "sr-only"}>
											{String(hour).padStart(2, "0")}
										</span>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{WEEKDAYS.map((day, index) => (
								<tr key={day}>
									<th
										scope="row"
										className="pr-2 text-left font-normal text-muted-foreground"
									>
										{day.slice(0, 3)}
									</th>
									{heatmap
										.filter((r) => r.weekday === index + 1)
										.map((r) => (
											<td
												key={r.hour}
												className="h-5 rounded-sm"
												style={{
													background: r.count
														? `color-mix(in srgb, var(--primary) ${25 + (r.count / Math.max(max, 1)) * 75}%, var(--muted))`
														: "var(--muted)",
												}}
												title={`${day}, ${String(r.hour).padStart(2, "0")}:00 UTC: ${r.count} clicks`}
											>
												<span className="sr-only">
													{r.count} clicks at {r.hour}:00 UTC
												</span>
											</td>
										))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<p className="text-sm text-muted-foreground">
					{peak
						? `Busiest: ${peak.day} at ${String(peak.hour).padStart(2, "0")}:00 UTC (${peak.count} clicks).`
						: "No clicks in this range yet. Activity will appear here as people visit your links."}
				</p>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<span className="text-xs text-muted-foreground">
						Darker cells mean more clicks.
					</span>
					<Button
						size="sm"
						disabled={!ready}
						variant="outline"
						onClick={() =>
							downloadFile(
								`Weekday,Hour (UTC),Clicks\n${heatmap.map((r) => `${r.day},${r.hour},${r.count}`).join("\n")}`,
								`llink-click-times-${days}d.csv`,
								"text/csv",
							)
						}
					>
						<Download data-icon="inline-start" /> Export click times
					</Button>
				</div>
			</section>
		</div>
	);
}
