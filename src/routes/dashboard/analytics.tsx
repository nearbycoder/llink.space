import { createFileRoute } from "@tanstack/react-router"
import { useTRPC } from "#/integrations/trpc/react"
import { useQuery } from "@tanstack/react-query"
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
} from "recharts"
import {
	eachDayOfInterval,
	format,
	formatDistanceToNow,
	subDays,
} from "date-fns"
import {
	Activity,
	Clock3,
	Globe2,
	MousePointerClick,
	TrendingUp,
} from "lucide-react"

export const Route = createFileRoute("/dashboard/analytics")({
	component: AnalyticsPage,
})

const chartColors = [
	"#FF8A4C",
	"#8AE1E7",
	"#F5FF7B",
	"#F2B7E2",
	"#7CC6FF",
	"#7FE8A7",
]

function truncateLabel(value: string, maxLength = 18) {
	if (value.length <= maxLength) return value
	return `${value.slice(0, maxLength - 1)}…`
}

function normalizeReferrer(value: string | null | undefined) {
	const raw = value?.trim() ?? ""
	if (!raw) return "Direct"
	return raw.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0] || "Direct"
}

function buildSevenDayTrend(clicksByDay: Array<{ day: string; count: number }>) {
	const counts = new Map(clicksByDay.map((item) => [item.day, item.count]))
	const days = eachDayOfInterval({
		start: subDays(new Date(), 6),
		end: new Date(),
	})

	return days.map((day) => {
		const key = format(day, "yyyy-MM-dd")
		return {
			day: key,
			label: format(day, "EEE"),
			fullLabel: format(day, "MMM d"),
			count: counts.get(key) ?? 0,
		}
	})
}

function AnalyticsPage() {
	const trpc = useTRPC()
	const { data: summary, isLoading } = useQuery(
		trpc.analytics.getSummary.queryOptions(),
	)

	const totalClicks = summary?.totalClicks ?? 0
	const directClicks = summary?.directClicks ?? 0
	const directPercent = totalClicks > 0 ? Math.round((directClicks / totalClicks) * 100) : 0

	const chartData =
		summary?.clicksByLink.map((item, index) => {
			const label = item.title || item.url || "Untitled link"
			return {
				...item,
				label,
				shortLabel: truncateLabel(label),
				fill: chartColors[index % chartColors.length],
			}
		}) ?? []

	const trendData = buildSevenDayTrend(summary?.clicksByDay ?? [])
	const topLink = chartData[0]

	return (
		<div className="max-w-4xl px-4 py-5 sm:px-6 md:p-8">
			<div className="mb-6">
				<h1
					className="text-2xl text-[#11110F]"
					style={{ fontFamily: "'Archivo Black', sans-serif" }}
				>
					Analytics
				</h1>
				<p className="text-sm text-[#4B4B45] mt-1">
					Track click volume, traffic sources, and top-performing links
				</p>
			</div>

			{isLoading ? (
				<div className="space-y-4">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="h-32 border-2 border-black bg-[#FFFCEF] rounded-xl animate-pulse"
						/>
					))}
				</div>
			) : (
				<div className="space-y-6">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<div className="kinetic-panel p-5 bg-[#FFFCEF]">
							<div className="mb-2 flex items-center gap-2">
								<span className="inline-flex items-center justify-center rounded-md border-2 border-black bg-[#F5FF7B] p-1">
									<MousePointerClick className="h-3.5 w-3.5 text-[#11110F]" />
								</span>
								<span className="text-sm text-[#4B4B45]">Total clicks</span>
							</div>
							<p className="text-3xl font-bold text-[#11110F]">{totalClicks}</p>
						</div>

						<div className="kinetic-panel p-5 bg-[#FFFCEF]">
							<div className="mb-2 flex items-center gap-2">
								<span className="inline-flex items-center justify-center rounded-md border-2 border-black bg-[#8AE1E7] p-1">
									<Clock3 className="h-3.5 w-3.5 text-[#11110F]" />
								</span>
								<span className="text-sm text-[#4B4B45]">Last 24h</span>
							</div>
							<p className="text-3xl font-bold text-[#11110F]">
								{summary?.clicksLast24h ?? 0}
							</p>
						</div>

						<div className="kinetic-panel p-5 bg-[#FFFCEF]">
							<div className="mb-2 flex items-center gap-2">
								<span className="inline-flex items-center justify-center rounded-md border-2 border-black bg-[#F2B7E2] p-1">
									<TrendingUp className="h-3.5 w-3.5 text-[#11110F]" />
								</span>
								<span className="text-sm text-[#4B4B45]">Last 7 days</span>
							</div>
							<p className="text-3xl font-bold text-[#11110F]">
								{summary?.clicksLast7d ?? 0}
							</p>
						</div>

						<div className="kinetic-panel p-5 bg-[#FFFCEF]">
							<div className="mb-2 flex items-center gap-2">
								<span className="inline-flex items-center justify-center rounded-md border-2 border-black bg-[#7CC6FF] p-1">
									<Globe2 className="h-3.5 w-3.5 text-[#11110F]" />
								</span>
								<span className="text-sm text-[#4B4B45]">Traffic sources</span>
							</div>
							<p className="text-3xl font-bold text-[#11110F]">
								{summary?.uniqueReferrers ?? 0}
							</p>
							<p className="mt-1 text-xs text-[#6A675C]">
								{directClicks} direct ({directPercent}%)
							</p>
						</div>
					</div>

					{summary && chartData.length > 0 && (
						<div className="kinetic-panel p-5">
							<div className="mb-4 flex flex-wrap items-end justify-between gap-2">
								<div>
									<h2 className="text-sm font-medium text-[#11110F]">
										Clicks by link
									</h2>
									<p className="mt-1 text-xs text-[#6A675C]">
										Top performing links in your profile
									</p>
								</div>
								{topLink ? (
									<div className="rounded-lg border border-black/15 bg-white px-2.5 py-1 text-xs">
										Top link: <span className="font-semibold">{topLink.label}</span>{" "}
										({topLink.count})
									</div>
								) : null}
							</div>
							<div className="rounded-xl border-2 border-black/15 bg-white px-2 py-3">
								<ResponsiveContainer width="100%" height={220}>
									<BarChart
										data={chartData}
										margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
									>
										<CartesianGrid
											vertical={false}
											strokeDasharray="4 4"
											stroke="#11110F33"
										/>
										<XAxis
											dataKey="shortLabel"
											tick={{ fontSize: 11, fill: "#4B4B45" }}
											tickLine={false}
											axisLine={false}
											minTickGap={12}
											tickMargin={8}
										/>
										<YAxis
											allowDecimals={false}
											tick={{ fontSize: 11, fill: "#4B4B45" }}
											tickLine={false}
											axisLine={false}
											width={30}
										/>
										<Tooltip
											cursor={{ fill: "#11110F12" }}
											contentStyle={{
												border: "2px solid #11110F",
												borderRadius: "10px",
												fontSize: "12px",
												backgroundColor: "#FFFCEF",
												boxShadow: "4px 4px 0 #11110F",
											}}
											labelStyle={{
												fontWeight: 700,
												color: "#11110F",
												marginBottom: 4,
											}}
											formatter={(value, _name, item) => [
												`${value} clicks`,
												item.payload.label,
											]}
										/>
										<Bar
											dataKey="count"
											radius={[8, 8, 0, 0]}
											stroke="#11110F"
											strokeWidth={1.5}
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
						<div className="kinetic-panel p-5 xl:col-span-3">
							<div className="mb-4">
								<h2 className="text-sm font-medium text-[#11110F]">
									Clicks trend (7 days)
								</h2>
								<p className="mt-1 text-xs text-[#6A675C]">
									Daily click volume over the last week
								</p>
							</div>
							<div className="rounded-xl border-2 border-black/15 bg-white px-2 py-3">
								<ResponsiveContainer width="100%" height={210}>
									<AreaChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
										<defs>
											<linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
												<stop offset="5%" stopColor="#8AE1E7" stopOpacity={0.85} />
												<stop offset="95%" stopColor="#8AE1E7" stopOpacity={0.15} />
											</linearGradient>
										</defs>
										<CartesianGrid
											vertical={false}
											strokeDasharray="4 4"
											stroke="#11110F22"
										/>
										<XAxis
											dataKey="label"
											tick={{ fontSize: 11, fill: "#4B4B45" }}
											tickLine={false}
											axisLine={false}
										/>
										<YAxis
											allowDecimals={false}
											tick={{ fontSize: 11, fill: "#4B4B45" }}
											tickLine={false}
											axisLine={false}
											width={30}
										/>
										<Tooltip
											cursor={{ stroke: "#11110F33", strokeWidth: 1 }}
											contentStyle={{
												border: "2px solid #11110F",
												borderRadius: "10px",
												fontSize: "12px",
												backgroundColor: "#FFFCEF",
												boxShadow: "4px 4px 0 #11110F",
											}}
											labelFormatter={(_, payload) =>
												payload?.[0]?.payload?.fullLabel ?? ""
											}
											formatter={(value) => [`${value} clicks`, "Clicks"]}
										/>
										<Area
											type="monotone"
											dataKey="count"
											stroke="#11110F"
											strokeWidth={2}
											fill="url(#trendFill)"
										/>
									</AreaChart>
								</ResponsiveContainer>
							</div>
						</div>

						<div className="kinetic-panel p-5 xl:col-span-2">
							<div className="mb-4">
								<h2 className="text-sm font-medium text-[#11110F]">
									Referrer sources
								</h2>
								<p className="mt-1 text-xs text-[#6A675C]">
									Where click traffic comes from
								</p>
							</div>
							<div className="space-y-2">
								{(summary?.topReferrers ?? []).slice(0, 6).map((item) => {
									const percent = totalClicks
										? Math.round((item.count / totalClicks) * 100)
										: 0
									return (
										<div
											key={item.source}
											className="rounded-lg border border-black/15 bg-white px-3 py-2"
										>
											<div className="mb-1 flex items-center justify-between gap-2">
												<span className="truncate text-xs font-medium text-[#11110F]">
													{item.source}
												</span>
												<span className="text-xs text-[#4B4B45]">
													{item.count} ({percent}%)
												</span>
											</div>
											<div className="h-1.5 rounded-full bg-[#ECE9DF]">
												<div
													className="h-full rounded-full bg-[#FF8A4C]"
													style={{ width: `${Math.max(percent, 3)}%` }}
												/>
											</div>
										</div>
									)
								})}
								{(summary?.topReferrers ?? []).length === 0 && (
									<p className="rounded-lg border border-black/15 bg-white px-3 py-2 text-xs text-[#6A675C]">
										No source data yet
									</p>
								)}
							</div>
						</div>
					</div>

					{summary && summary.recentClicks.length > 0 && (
						<div className="kinetic-panel p-5">
							<h2 className="mb-4 text-sm font-medium text-[#11110F]">
								Recent clicks
							</h2>
							<div className="space-y-2">
								{summary.recentClicks.slice(0, 12).map((click) => {
									const source = normalizeReferrer(click.referrer)
									const linkLabel =
										click.linkTitle?.trim() || click.linkUrl?.trim() || "Deleted link"

									return (
										<div
											key={click.id}
											className="flex items-start justify-between gap-3 rounded-lg border border-black/10 bg-[#FFFCEF] px-3 py-2.5"
										>
											<div className="min-w-0">
												<p className="truncate text-xs font-semibold text-[#11110F]">
													{linkLabel}
												</p>
												<p className="mt-0.5 truncate text-xs text-[#4B4B45]">
													Source: {source}
												</p>
											</div>
											<span className="shrink-0 text-xs text-[#6A675C]">
												{click.clickedAt
													? formatDistanceToNow(new Date(click.clickedAt), {
															addSuffix: true,
														})
													: ""}
											</span>
										</div>
									)
								})}
							</div>
						</div>
					)}

					{totalClicks === 0 && (
						<div className="kinetic-panel py-16 text-center">
							<Activity className="mx-auto mb-3 h-8 w-8 text-[#6A675C]" />
							<p className="text-sm text-[#4B4B45]">No clicks yet</p>
							<p className="mt-1 text-xs text-[#6A675C]">
								Share your profile link to start collecting analytics
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
