import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { format, formatDistanceToNow } from "date-fns";
import {
	Activity,
	Clock3,
	Download,
	Globe2,
	type LucideIcon,
	MousePointerClick,
	RefreshCw,
	TrendingUp,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { AnalyticsLoadingState } from "#/components/dashboard/DashboardLoading";
import { PageHeader } from "#/components/dashboard/PageHeader";
import { TrafficInsights } from "#/components/dashboard/TrafficInsights";
import { Button } from "#/components/ui/button";
import { useTRPC } from "#/integrations/trpc/react";
import { comparisonLabel } from "#/lib/analytics-tools";
import { getDashboardAnalytics } from "#/lib/auth-server";
import { buildAnalyticsCsv } from "#/lib/dashboard-tools";

export const Route = createFileRoute("/dashboard/analytics")({
	validateSearch: (search: Record<string, unknown>): { days: 7 | 30 | 90 } => ({
		days: Number(search.days) === 30 ? 30 : Number(search.days) === 90 ? 90 : 7,
	}),
	loaderDeps: ({ search }) => ({ days: search.days }),
	loader: async ({ deps }) => {
		const result = await getDashboardAnalytics({ data: { days: deps.days } });
		if (result.status === "unauthenticated") {
			throw redirect({ to: "/sign-in" });
		}
		if (result.status === "no-profile") {
			throw redirect({ to: "/onboarding" });
		}
		return { initialSummary: result.summary };
	},
	pendingMs: 150,
	pendingMinMs: 300,
	pendingComponent: AnalyticsLoadingState,
	component: AnalyticsPage,
});

// Single-series charts use one hue; the top link gets the signal accent.
const BAR_FILL = "#16140F";
const BAR_PEAK_FILL = "#FF5F1F";
const AXIS_TICK = { fontSize: 11, fill: "#67625A" };
const GRID_STROKE = "#16140F14";
const tooltipStyle = {
	border: "1px solid #E3DED3",
	borderRadius: "12px",
	fontSize: "12px",
	backgroundColor: "#FFFFFF",
	boxShadow: "0 12px 32px -12px rgb(22 20 15 / 0.35)",
	padding: "8px 12px",
};

function truncateLabel(value: string, maxLength = 18) {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength - 1)}…`;
}

function normalizeReferrer(value: string | null | undefined) {
	const raw = value?.trim() ?? "";
	if (!raw) return "Direct";
	return raw.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0] || "Direct";
}

function buildTrend(
	clicksByDay: Array<{ day: string; count: number }>,
	days: number,
) {
	const formatter = new Intl.DateTimeFormat(
		"en-US",
		days === 7
			? { weekday: "short", timeZone: "UTC" }
			: { month: "short", day: "numeric", timeZone: "UTC" },
	);
	return clicksByDay.map((item) => ({
		...item,
		label: formatter.format(new Date(`${item.day}T00:00:00Z`)),
		fullLabel: `${item.day} (UTC)`,
	}));
}

function AnalyticsPage() {
	const { initialSummary } = Route.useLoaderData();
	const trpc = useTRPC();
	const trendFillId = useId();
	const [isHydrated, setIsHydrated] = useState(false);
	const { days: rangeDays } = Route.useSearch();
	const navigate = Route.useNavigate();
	const {
		data: summary = initialSummary,
		isFetching,
		isError,
		refetch,
	} = useQuery({
		...trpc.analytics.getSummary.queryOptions({ days: rangeDays }),
		initialData:
			rangeDays === initialSummary.rangeDays ? initialSummary : undefined,
		staleTime: 30_000,
		placeholderData: (previous) => previous,
	});

	const totalClicks = summary?.totalClicks ?? 0;
	const directClicks = summary?.directClicks ?? 0;
	const periodClicks = summary?.periodClicks ?? 0;
	const displayRangeDays = summary?.rangeDays ?? rangeDays;
	const directPercent =
		periodClicks > 0 ? Math.round((directClicks / periodClicks) * 100) : 0;

	const chartData =
		summary?.clicksByLink.slice(0, 20).map((item, index) => {
			const label = item.title || item.url || "Untitled link";
			return {
				...item,
				label,
				shortLabel: truncateLabel(label),
				fill: index === 0 ? BAR_PEAK_FILL : BAR_FILL,
			};
		}) ?? [];

	const trendData = buildTrend(summary?.clicksByDay ?? [], displayRangeDays);
	const topLink = chartData[0];
	useEffect(() => {
		setIsHydrated(true);
	}, []);

	const handleExportCsv = () => {
		const csv = buildAnalyticsCsv(summary);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
		const downloadUrl = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = downloadUrl;
		anchor.download = `llink-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
		anchor.style.display = "none";
		document.body.append(anchor);
		anchor.click();
		anchor.remove();
		window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
	};

	return (
		<div className="dashboard-page px-4 py-6 sm:px-6 md:px-10">
			<PageHeader
				eyebrow="Grow"
				title="Analytics"
				description="Track click volume, traffic sources, and top-performing links"
				actions={
					<>
						<fieldset
							className="inline-flex rounded-full border border-border bg-card p-0.5"
							aria-label="Analytics date range"
						>
							{([7, 30, 90] as const).map((days) => (
								<button
									key={days}
									type="button"
									onClick={() => void navigate({ search: { days } })}
									aria-pressed={rangeDays === days}
									className={`rounded-full px-3.5 py-1.5 font-mono text-xs font-medium transition-colors ${rangeDays === days ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
								>
									{days}d
								</button>
							))}
						</fieldset>
						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={() => void refetch()}
							disabled={isFetching}
							aria-label="Refresh analytics"
						>
							<RefreshCw
								className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
								aria-hidden="true"
							/>
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={handleExportCsv}
							disabled={!isHydrated || isFetching}
						>
							<Download className="h-4 w-4" />
							Export CSV
						</Button>
					</>
				}
			/>

			{isError && (
				<p
					role="alert"
					className="mb-4 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
				>
					Analytics could not refresh. Showing the last available data. Use
					Refresh analytics to try again.
				</p>
			)}
			<div className="space-y-6" aria-busy={isFetching}>
				<div className="surface grid grid-cols-2 overflow-hidden xl:grid-cols-4">
					<StatCell
						icon={MousePointerClick}
						label="Total clicks"
						value={totalClicks}
						detail="All time"
					/>
					<StatCell
						icon={Clock3}
						label="Last 24h"
						value={summary?.clicksLast24h ?? 0}
						detail="Rolling window"
						className="border-l border-border"
					/>
					<StatCell
						icon={TrendingUp}
						label={`Last ${displayRangeDays} days`}
						value={periodClicks}
						detail={`${comparisonLabel(
							periodClicks,
							summary?.previousPeriodClicks ?? 0,
						)} vs previous ${displayRangeDays} days (${summary?.previousPeriodClicks ?? 0} clicks)`}
						accent
						className="border-t border-border xl:border-t-0 xl:border-l"
					/>
					<StatCell
						icon={Globe2}
						label="Traffic sources"
						value={summary?.uniqueReferrers ?? 0}
						detail={`${directClicks} direct (${directPercent}%)`}
						className="border-l border-t border-border xl:border-t-0"
					/>
				</div>

				<TrafficInsights
					devices={summary.devices}
					heatmap={summary.clickHeatmap}
					days={displayRangeDays}
				/>

				{summary && chartData.length > 0 && (
					<div className="surface p-5 sm:p-6">
						<div className="mb-4 flex flex-wrap items-end justify-between gap-2">
							<div>
								<h2 className="text-base font-semibold text-foreground">
									Clicks by link
								</h2>
								<p className="mt-1 text-xs text-muted-foreground">
									Top 20 performing links in the last {displayRangeDays} days
								</p>
							</div>
							{topLink ? (
								<div className="inline-flex items-center gap-2 rounded-full bg-signal-soft px-3 py-1 text-xs text-foreground">
									<span
										aria-hidden="true"
										className="size-2 rounded-full bg-signal"
									/>
									Top link:{" "}
									<span className="font-semibold">{topLink.label}</span> (
									{topLink.count})
								</div>
							) : null}
						</div>
						<div className="-mx-2">
							<ResponsiveContainer width="100%" height={240}>
								<BarChart
									data={chartData}
									margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
								>
									<CartesianGrid
										vertical={false}
										strokeDasharray="4 4"
										stroke={GRID_STROKE}
									/>
									<XAxis
										dataKey="shortLabel"
										tick={AXIS_TICK}
										tickLine={false}
										axisLine={false}
										minTickGap={12}
										tickMargin={8}
									/>
									<YAxis
										allowDecimals={false}
										tick={AXIS_TICK}
										tickLine={false}
										axisLine={false}
										width={30}
									/>
									<Tooltip
										cursor={{ fill: "#16140F0A" }}
										contentStyle={tooltipStyle}
										labelStyle={{
											fontWeight: 600,
											color: "#16140F",
											marginBottom: 4,
										}}
										formatter={(value, _name, item) => [
											`${value} clicks`,
											item.payload.label,
										]}
									/>
									<Bar
										dataKey="count"
										isAnimationActive={false}
										radius={[4, 4, 0, 0]}
										maxBarSize={36}
									>
										{chartData.map((entry) => (
											<Cell key={entry.linkId} fill={entry.fill} />
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</div>
				)}

				<div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
					<div className="surface p-5 sm:p-6 xl:col-span-3">
						<div className="mb-4">
							<h2 className="text-base font-semibold text-foreground">
								Clicks trend ({displayRangeDays} days)
							</h2>
							<p className="mt-1 text-xs text-muted-foreground">
								Daily click volume in the selected window (UTC)
							</p>
						</div>
						<div className="-mx-2">
							<ResponsiveContainer width="100%" height={220}>
								<AreaChart
									data={trendData}
									margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
								>
									<defs>
										<linearGradient
											id={trendFillId}
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop
												offset="0%"
												stopColor="#FF5F1F"
												stopOpacity={0.28}
											/>
											<stop offset="100%" stopColor="#FF5F1F" stopOpacity={0} />
										</linearGradient>
									</defs>
									<CartesianGrid
										vertical={false}
										strokeDasharray="4 4"
										stroke={GRID_STROKE}
									/>
									<XAxis
										dataKey="label"
										tick={AXIS_TICK}
										tickLine={false}
										axisLine={false}
									/>
									<YAxis
										allowDecimals={false}
										tick={AXIS_TICK}
										tickLine={false}
										axisLine={false}
										width={30}
									/>
									<Tooltip
										cursor={{ stroke: "#16140F40", strokeWidth: 1 }}
										contentStyle={tooltipStyle}
										labelFormatter={(_, payload) =>
											payload?.[0]?.payload?.fullLabel ?? ""
										}
										formatter={(value) => [`${value} clicks`, "Clicks"]}
									/>
									<Area
										type="monotone"
										dataKey="count"
										isAnimationActive={false}
										stroke="#E5531A"
										strokeWidth={2}
										activeDot={{ r: 5, stroke: "#FFFFFF", strokeWidth: 2 }}
										fill={`url(#${trendFillId})`}
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</div>

					<div className="surface p-5 sm:p-6 xl:col-span-2">
						<div className="mb-4">
							<h2 className="text-base font-semibold text-foreground">
								Referrer sources
							</h2>
							<p className="mt-1 text-xs text-muted-foreground">
								Where click traffic comes from
							</p>
						</div>
						<div className="space-y-4">
							{(summary?.topReferrers ?? []).slice(0, 6).map((item) => {
								const percent = periodClicks
									? Math.round((item.count / periodClicks) * 100)
									: 0;
								return (
									<div key={item.source}>
										<div className="mb-1.5 flex items-center justify-between gap-2">
											<span className="truncate text-sm font-medium text-foreground">
												{item.source}
											</span>
											<span className="font-mono text-xs tabular-nums text-muted-foreground">
												{item.count} · {percent}%
											</span>
										</div>
										<div className="h-1.5 rounded-full bg-muted">
											<div
												className="h-full rounded-full bg-primary"
												style={{ width: `${Math.max(percent, 3)}%` }}
											/>
										</div>
									</div>
								);
							})}
							{(summary?.topReferrers ?? []).length === 0 && (
								<p className="rounded-xl border border-dashed border-border-strong px-3 py-6 text-center text-xs text-muted-foreground">
									No source data yet
								</p>
							)}
						</div>
					</div>
				</div>

				{summary && summary.recentClicks.length > 0 && (
					<div className="surface p-5 sm:p-6">
						<h2 className="mb-2 text-base font-semibold text-foreground">
							Recent clicks
						</h2>
						<div className="divide-y divide-border">
							{summary.recentClicks.slice(0, 12).map((click) => {
								const source = normalizeReferrer(click.referrer);
								const linkLabel =
									click.linkTitle?.trim() ||
									click.linkUrl?.trim() ||
									"Deleted link";

								return (
									<div
										key={click.id}
										className="flex items-start justify-between gap-3 py-3"
									>
										<div className="min-w-0">
											<p className="truncate text-sm font-medium text-foreground">
												{linkLabel}
											</p>
											<p className="mt-0.5 truncate text-xs text-muted-foreground">
												Source: {source}
											</p>
										</div>
										<span className="shrink-0 font-mono text-[11px] text-muted-foreground">
											{click.clickedAt
												? formatDistanceToNow(new Date(click.clickedAt), {
														addSuffix: true,
													})
												: ""}
										</span>
									</div>
								);
							})}
						</div>
					</div>
				)}

				<section className="surface overflow-hidden bg-card p-5 sm:p-6">
					<h2 className="font-display text-xl font-semibold">What changed</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						Compared with {summary?.previousRangeStart} –{" "}
						{summary?.previousRangeEnd}. Today is still in progress.
					</p>
					<div className="mt-4 overflow-x-auto">
						<table className="w-full text-left text-sm tabular-nums">
							<thead>
								<tr className="eyebrow">
									<th className="py-2 font-medium">Link</th>
									<th className="font-medium">Now</th>
									<th className="font-medium">Previous</th>
									<th className="font-medium">Change</th>
								</tr>
							</thead>
							<tbody>
								{(summary?.clicksByLink ?? []).slice(0, 20).map((l) => (
									<tr key={l.linkId} className="border-t border-border">
										<th className="max-w-48 truncate py-3 font-medium">
											{l.title || "Deleted link"}
										</th>
										<td>{l.count}</td>
										<td>{l.previousCount}</td>
										<td>{comparisonLabel(l.count, l.previousCount)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{!summary?.clicksByLink.length && (
						<p className="mt-3 text-sm text-muted-foreground">
							Click comparisons will appear here.
						</p>
					)}
				</section>
				{periodClicks === 0 && (
					<div className="surface py-16 text-center">
						<Activity className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
						<p className="text-sm text-muted-foreground">
							No clicks in the last {displayRangeDays} days
						</p>
						<p className="mt-1 text-xs text-muted-foreground">
							Share your profile link to start collecting analytics
						</p>
					</div>
				)}
			</div>
		</div>
	);
}

function StatCell({
	icon: Icon,
	label,
	value,
	detail,
	accent = false,
	className,
}: {
	icon: LucideIcon;
	label: string;
	value: number;
	detail: string;
	accent?: boolean;
	className?: string;
}) {
	return (
		<div className={`flex flex-col gap-3 p-4 sm:p-5 ${className ?? ""}`}>
			<span className="flex items-center justify-between gap-2 text-[13px] text-muted-foreground">
				{label}
				<Icon
					className={`h-4 w-4 ${accent ? "text-signal-strong" : ""}`}
					aria-hidden="true"
				/>
			</span>
			<p className="font-display text-[2rem] leading-none font-semibold tabular-nums text-foreground sm:text-[2.5rem]">
				{value}
			</p>
			<p className="text-xs leading-snug text-muted-foreground">{detail}</p>
		</div>
	);
}
