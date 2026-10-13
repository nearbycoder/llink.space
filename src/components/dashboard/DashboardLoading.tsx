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
		<div className="dashboard-workspace min-h-screen app-canvas md:flex">
			<aside className="dashboard-sidebar fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
				<div className="px-5 pt-5 pb-4">
					<SiteBrand size="md" />
				</div>
				<div className="px-3">
					<Skeleton className="h-10 w-full rounded-xl" />
				</div>
				<nav
					className="flex-1 space-y-0.5 px-3 pt-6"
					aria-label="Dashboard loading"
				>
					<p className="eyebrow mb-1.5 px-3">Build</p>
					{navItems.map(({ label, to, Icon }) => (
						<div
							key={label}
							className={`flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${
								isActive(to)
									? "bg-primary text-primary-foreground"
									: "text-foreground/75"
							}`}
						>
							<Icon className="size-4" />
							{label}
						</div>
					))}
				</nav>
				<div className="p-3">
					<Skeleton className="h-14 w-full rounded-2xl" />
				</div>
			</aside>

			<div className="min-w-0 flex-1 overflow-x-clip md:ml-64">
				<header className="border-b border-border bg-background/90 md:hidden">
					<div className="flex h-14 items-center justify-between px-4">
						<SiteBrand size="sm" />
						<Skeleton className="h-3 w-20" />
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
		<div className="mb-8 border-b border-border pb-7">
			<h1 className="text-foreground">{title}</h1>
			<p className="mt-2.5 text-[15px] text-muted-foreground">{description}</p>
		</div>
	);
}

export function LinksLoadingState() {
	return (
		<LoadingRegion
			label="Loading your links"
			className="dashboard-page px-4 py-6 sm:px-6 md:px-10"
		>
			<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<PageHeading
					title="Links"
					description="Organize links into sections and drag them where they belong"
				/>
				<div className="flex gap-2">
					<Skeleton className="h-10 w-28 border border-border" />
					<Skeleton className="h-10 w-24 border border-border" />
				</div>
			</div>
			<div className="space-y-5">
				{loadingSections.map((section) => (
					<section key={section.title} className="space-y-2">
						<div className="flex items-center gap-2 px-1">
							<span className="eyebrow">{section.title}</span>
							<Skeleton className="h-2 flex-1" />
						</div>
						{section.items.map((item) => (
							<div key={item} className="surface flex items-center gap-3 p-4">
								<Skeleton className="h-10 w-10 shrink-0 rounded-xl border border-border/20" />
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
			className="dashboard-page px-4 py-6 sm:px-6 md:px-10"
		>
			<PageHeading
				title="Analytics"
				description="Track click volume, traffic sources, and top-performing links"
			/>
			<div className="space-y-6">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{metrics.map((metric, index) => (
						<div key={metric} className="surface bg-card p-5">
							<div className="mb-3 flex items-center gap-2">
								<span
									className={`inline-flex rounded-lg p-1.5 ${index % 2 ? "bg-muted" : "bg-signal-soft text-signal-strong"}`}
								>
									<MousePointerClick className="h-3.5 w-3.5" />
								</span>
								<span className="text-sm text-muted-foreground">{metric}</span>
							</div>
							<Skeleton className="h-9 w-16" />
						</div>
					))}
				</div>
				<div className="surface p-5">
					<p className="text-sm font-medium text-foreground">
						Clicks over the last 7 days
					</p>
					<div className="mt-5 flex h-52 items-end gap-3 rounded-xl bg-muted/60 p-4">
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
			className="dashboard-page px-4 py-6 sm:px-6 md:px-10"
		>
			<PageHeading
				title="Profile"
				description="Your public profile information"
			/>
			<div className="surface mb-4 flex items-center gap-3 p-6">
				<Skeleton className="h-10 w-10 rounded-full border border-border" />
				<div className="flex-1 space-y-2">
					<Skeleton className="h-4 w-28" />
					<Skeleton className="h-3 w-48 max-w-full" />
				</div>
			</div>
			<div className="surface space-y-5 p-6">
				{["Display name", "Bio", "Avatar", "Page background"].map(
					(label, index) => (
						<div key={label} className="space-y-2">
							<p className="text-sm font-semibold text-foreground">{label}</p>
							<Skeleton
								className={
									index === 1
										? "h-20 w-full border border-border/20"
										: "h-10 w-full border border-border/20"
								}
							/>
						</div>
					),
				)}
			</div>
		</LoadingRegion>
	);
}
