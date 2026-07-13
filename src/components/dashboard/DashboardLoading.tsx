import { useLocation } from "@tanstack/react-router";
import {
	BarChart3,
	LayoutDashboard,
	MousePointerClick,
	User,
} from "lucide-react";
import { SiteBrand } from "#/components/SiteBrand";
import { LoadingRegion, Skeleton } from "#/components/ui/skeleton";

const navItems = [
	{ label: "Links", to: "/dashboard", Icon: LayoutDashboard },
	{ label: "Profile", to: "/dashboard/profile", Icon: User },
	{ label: "Analytics", to: "/dashboard/analytics", Icon: BarChart3 },
];

const loadingSections = [
	{ title: "Featured", items: ["featured-primary", "featured-secondary"] },
	{ title: "More links", items: ["more-primary"] },
];

const loadingTrend = [
	{ day: "Mon", height: 42 },
	{ day: "Tue", height: 68 },
	{ day: "Wed", height: 50 },
	{ day: "Thu", height: 82 },
	{ day: "Fri", height: 58 },
	{ day: "Sat", height: 92 },
	{ day: "Sun", height: 72 },
];

export function DashboardPendingShell() {
	const { pathname } = useLocation();
	return <DashboardPendingShellContent pathname={pathname} />;
}

export function DashboardPendingShellContent({
	pathname,
}: {
	pathname: string;
}) {
	const activeRoute = pathname.startsWith("/dashboard/analytics")
		? "analytics"
		: pathname.startsWith("/dashboard/profile")
			? "profile"
			: "links";
	const isActive = (to: string) =>
		to === "/dashboard"
			? pathname === "/dashboard" || pathname === "/dashboard/"
			: pathname === to;

	return (
		<div className="min-h-screen kinetic-gradient md:flex">
			<aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r-2 border-black bg-[#FFFCEF]/95 md:flex">
				<div className="border-b-2 border-black p-5">
					<SiteBrand size="md" />
				</div>
				<nav className="flex-1 space-y-1 p-3" aria-label="Dashboard loading">
					{navItems.map(({ label, to, Icon }) => (
						<div
							key={label}
							className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-sm font-semibold ${
								isActive(to)
									? "border-black bg-[#11110F] text-[#F5FF7B] shadow-[2px_2px_0_0_#11110F]"
									: "border-transparent text-[#4B4B45]"
							}`}
						>
							<Icon className="h-4 w-4" />
							{label}
						</div>
					))}
				</nav>
				<div className="space-y-3 border-t-2 border-black p-4">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-4 w-20" />
				</div>
			</aside>

			<div className="flex-1 md:ml-60">
				<header className="border-b-2 border-black bg-[#FFFCEF]/95 md:hidden">
					<div className="flex items-center justify-between px-4 py-3">
						<SiteBrand size="sm" />
						<Skeleton className="h-8 w-24 border-2 border-black" />
					</div>
					<div className="flex gap-2 px-3 pb-3">
						{navItems.map(({ label, to }) => (
							<div
								key={label}
								className={`rounded-xl border-2 px-3 py-2 text-xs font-semibold ${
									isActive(to)
										? "border-black bg-[#11110F] text-[#F5FF7B]"
										: "border-black/30 bg-white text-[#4B4B45]"
								}`}
							>
								{label}
							</div>
						))}
					</div>
				</header>
				{activeRoute === "analytics" ? (
					<AnalyticsLoadingState />
				) : activeRoute === "profile" ? (
					<ProfileLoadingState />
				) : (
					<LinksLoadingState />
				)}
			</div>
		</div>
	);
}

function PageHeading({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div className="mb-6">
			<h1
				className="text-2xl text-[#11110F]"
				style={{ fontFamily: "'Archivo Black', sans-serif" }}
			>
				{title}
			</h1>
			<p className="mt-1 text-sm text-[#4B4B45]">{description}</p>
		</div>
	);
}

export function LinksLoadingState() {
	return (
		<LoadingRegion
			label="Loading your links"
			className="max-w-3xl px-4 py-5 sm:px-6 md:p-8"
		>
			<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<PageHeading
					title="Links"
					description="Organize links into sections and drag them where they belong"
				/>
				<div className="flex gap-2">
					<Skeleton className="h-10 w-28 border-2 border-black" />
					<Skeleton className="h-10 w-24 border-2 border-black" />
				</div>
			</div>
			<div className="space-y-5">
				{loadingSections.map((section) => (
					<section key={section.title} className="space-y-2">
						<div className="flex items-center gap-2 px-1">
							<span className="text-xs font-bold uppercase tracking-[0.12em] text-[#4B4B45]">
								{section.title}
							</span>
							<Skeleton className="h-2 flex-1" />
						</div>
						{section.items.map((item) => (
							<div
								key={item}
								className="kinetic-panel flex items-center gap-3 p-4"
							>
								<Skeleton className="h-10 w-10 shrink-0 rounded-xl border-2 border-black/20" />
								<div className="min-w-0 flex-1 space-y-2">
									<Skeleton className="h-4 w-2/5" />
									<Skeleton className="h-3 w-3/4" />
								</div>
								<Skeleton className="h-8 w-8 rounded-lg" />
							</div>
						))}
					</section>
				))}
			</div>
		</LoadingRegion>
	);
}

const metrics = ["Total clicks", "Last 24h", "Last 7 days", "Traffic sources"];

export function AnalyticsLoadingState() {
	return (
		<LoadingRegion
			label="Loading your analytics"
			className="max-w-4xl px-4 py-5 sm:px-6 md:p-8"
		>
			<PageHeading
				title="Analytics"
				description="Track click volume, traffic sources, and top-performing links"
			/>
			<div className="space-y-6">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{metrics.map((metric, index) => (
						<div key={metric} className="kinetic-panel bg-[#FFFCEF] p-5">
							<div className="mb-3 flex items-center gap-2">
								<span
									className={`inline-flex rounded-md border-2 border-black p-1 ${index % 2 ? "bg-[#8AE1E7]" : "bg-[#F5FF7B]"}`}
								>
									<MousePointerClick className="h-3.5 w-3.5" />
								</span>
								<span className="text-sm text-[#4B4B45]">{metric}</span>
							</div>
							<Skeleton className="h-9 w-16" />
						</div>
					))}
				</div>
				<div className="kinetic-panel p-5">
					<p className="text-sm font-medium text-[#11110F]">
						Clicks over the last 7 days
					</p>
					<div className="mt-5 flex h-52 items-end gap-3 rounded-xl border-2 border-black/15 bg-white p-4">
						{loadingTrend.map(({ day, height }) => (
							<Skeleton
								key={day}
								className="flex-1 rounded-t-md"
								style={{ height: `${height}%` }}
							/>
						))}
					</div>
				</div>
			</div>
		</LoadingRegion>
	);
}

export function ProfileLoadingState() {
	return (
		<LoadingRegion
			label="Loading your profile"
			className="max-w-2xl px-4 py-5 sm:px-6 md:p-8"
		>
			<PageHeading
				title="Profile"
				description="Your public profile information"
			/>
			<div className="kinetic-panel mb-4 flex items-center gap-3 p-6">
				<Skeleton className="h-10 w-10 rounded-full border-2 border-black" />
				<div className="flex-1 space-y-2">
					<Skeleton className="h-4 w-28" />
					<Skeleton className="h-3 w-48 max-w-full" />
				</div>
			</div>
			<div className="kinetic-panel space-y-5 p-6">
				{["Display name", "Bio", "Avatar", "Page background"].map(
					(label, index) => (
						<div key={label} className="space-y-2">
							<p className="text-sm font-semibold text-[#11110F]">{label}</p>
							<Skeleton
								className={
									index === 1
										? "h-20 w-full border-2 border-black/20"
										: "h-10 w-full border-2 border-black/20"
								}
							/>
						</div>
					),
				)}
			</div>
		</LoadingRegion>
	);
}
