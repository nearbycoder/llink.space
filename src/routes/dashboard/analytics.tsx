import { createFileRoute } from "@tanstack/react-router"
import { useTRPC } from "#/integrations/trpc/react"
import { useQuery } from "@tanstack/react-query"
import {
	BarChart,
	Bar,
	CartesianGrid,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from "recharts"
import { formatDistanceToNow } from "date-fns"
import { MousePointerClick, TrendingUp } from "lucide-react"

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

function AnalyticsPage() {
	const trpc = useTRPC()
	const { data: summary, isLoading } = useQuery(
		trpc.analytics.getSummary.queryOptions(),
	)
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

	return (
		<div className="max-w-3xl px-4 py-5 sm:px-6 md:p-8">
			<div className="mb-6">
				<h1
					className="text-2xl text-[#11110F]"
					style={{ fontFamily: "'Archivo Black', sans-serif" }}
				>
					Analytics
				</h1>
				<p className="text-sm text-[#4B4B45] mt-1">
					Track your link performance
				</p>
			</div>

			{isLoading ? (
				<div className="space-y-4">
					{[1, 2].map((i) => (
						<div
							key={i}
							className="h-32 border-2 border-black bg-[#FFFCEF] rounded-xl animate-pulse"
						/>
					))}
				</div>
			) : (
				<div className="space-y-6">
					{/* Stats cards */}
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="kinetic-panel p-5 bg-[#FFFCEF]">
							<div className="flex items-center gap-2 mb-2">
								<span className="inline-flex items-center justify-center rounded-md border-2 border-black bg-[#F5FF7B] p-1">
									<MousePointerClick className="w-3.5 h-3.5 text-[#11110F]" />
								</span>
								<span className="text-sm text-[#4B4B45]">Total clicks</span>
							</div>
							<p className="text-3xl font-bold text-[#11110F]">
								{summary?.totalClicks ?? 0}
							</p>
						</div>
						<div className="kinetic-panel p-5 bg-[#FFFCEF]">
							<div className="flex items-center gap-2 mb-2">
								<span className="inline-flex items-center justify-center rounded-md border-2 border-black bg-[#8AE1E7] p-1">
									<TrendingUp className="w-3.5 h-3.5 text-[#11110F]" />
								</span>
								<span className="text-sm text-[#4B4B45]">Active links</span>
							</div>
							<p className="text-3xl font-bold text-[#11110F]">
								{summary?.clicksByLink.length ?? 0}
							</p>
						</div>
					</div>

					{/* Clicks by link chart */}
					{summary && chartData.length > 0 && (
						<div className="kinetic-panel p-5">
							<div className="mb-4">
								<h2 className="text-sm font-medium text-[#11110F]">
									Clicks by link
								</h2>
								<p className="text-xs text-[#6A675C] mt-1">
									Top performing links in your profile
								</p>
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

							<div className="mt-4 grid gap-2 sm:grid-cols-2">
								{chartData.slice(0, 6).map((entry) => (
									<div
										key={`legend-${entry.linkId}`}
										className="flex items-center justify-between rounded-lg border border-black/15 bg-white px-3 py-2"
									>
										<div className="flex min-w-0 items-center gap-2">
											<span
												className="h-2.5 w-2.5 shrink-0 rounded-full border border-black"
												style={{ backgroundColor: entry.fill }}
											/>
											<span className="truncate text-xs text-[#11110F]">
												{entry.label}
											</span>
										</div>
										<span className="text-xs font-semibold text-[#4B4B45]">
											{entry.count}
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Recent clicks */}
					{summary && summary.recentClicks.length > 0 && (
						<div className="kinetic-panel p-5">
							<h2 className="text-sm font-medium text-[#11110F] mb-4">
								Recent clicks
							</h2>
							<div className="space-y-2">
								{summary.recentClicks.slice(0, 10).map((click) => (
									<div
										key={click.id}
										className="flex items-center justify-between rounded-lg border border-black/10 bg-[#FFFCEF] px-3 py-2"
									>
										<div className="min-w-0 max-w-[70%] text-xs text-[#4B4B45]">
											<span className="block truncate text-[#11110F] font-medium">
												{click.referrer ?? "Direct"}
											</span>
										</div>
										<span className="text-xs text-[#6A675C]">
											{click.clickedAt
												? formatDistanceToNow(new Date(click.clickedAt), {
														addSuffix: true,
													})
												: ""}
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					{summary?.totalClicks === 0 && (
						<div className="text-center py-16 kinetic-panel">
							<MousePointerClick className="w-8 h-8 text-[#6A675C] mx-auto mb-3" />
							<p className="text-[#4B4B45] text-sm">No clicks yet</p>
							<p className="text-[#6A675C] text-xs mt-1">
								Share your profile link to start tracking
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
