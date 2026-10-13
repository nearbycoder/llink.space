import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import {
	ArrowUpRight,
	BarChart3,
	Globe,
	HeartPulse,
	LayoutDashboard,
	LogOut,
	Palette,
	Search,
	User,
	Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	DashboardCommandPalette,
	type DashboardCommandShortcut,
} from "#/components/dashboard/DashboardCommandPalette";
import { DashboardPendingShell } from "#/components/dashboard/DashboardLoading";
import {
	type DashboardNavItem,
	MobileDashboardNav,
} from "#/components/dashboard/MobileDashboardNav";
import { NavigationGuardContext } from "#/components/dashboard/UnsavedChangesGuard";
import { SiteBrand } from "#/components/SiteBrand";
import { useTRPC } from "#/integrations/trpc/react";
import { authClient } from "#/lib/auth-client";
import { checkDashboardAccess } from "#/lib/auth-server";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/dashboard")({
	headers: () => ({
		"cache-control": "private, no-store, no-cache, must-revalidate, max-age=0",
	}),
	head: () => ({
		meta: [
			{ title: "Dashboard | llink.space" },
			{
				name: "description",
				content: "Manage your llink.space profile, links, and analytics.",
			},
			{ name: "robots", content: "noindex, nofollow, noarchive" },
		],
	}),
	loader: async () => {
		const result = await checkDashboardAccess();
		if (result.status === "unauthenticated") {
			throw redirect({ to: "/sign-in" });
		}
		if (result.status === "no-profile") {
			throw redirect({ to: "/onboarding" });
		}
		return { initialProfile: result.profile };
	},
	pendingMs: 150,
	pendingMinMs: 300,
	pendingComponent: DashboardPendingShell,
	component: DashboardLayout,
});

const navItems: DashboardNavItem[] = [
	{ to: "/dashboard", label: "Links", icon: LayoutDashboard, exact: true },
	{
		to: "/dashboard/design",
		label: "Design studio",
		icon: Palette,
		exact: false,
	},
	{ to: "/dashboard/profile", label: "Profile", icon: User, exact: false },
	{
		to: "/dashboard/analytics",
		label: "Analytics",
		icon: BarChart3,
		exact: false,
	},
	{
		to: "/dashboard/health",
		label: "Link health",
		icon: HeartPulse,
		exact: false,
	},
	{ to: "/dashboard/audience", label: "Audience", icon: Users, exact: false },
	{
		to: "/dashboard/domains",
		label: "Custom domain",
		icon: Globe,
		exact: false,
	},
];

const navGroups = [
	{ label: "Build", items: navItems.slice(0, 3) },
	{ label: "Grow", items: [navItems[3], navItems[5]] },
	{ label: "Maintain", items: [navItems[4], navItems[6]] },
];

function isNavItemActive(item: DashboardNavItem, pathname: string) {
	return item.exact
		? pathname.replace(/\/$/, "") === item.to
		: pathname.startsWith(item.to);
}

function DashboardLayout() {
	const navigationGuard = useRef(() => true);
	const { initialProfile } = Route.useLoaderData();
	const location = useLocation();
	const navigate = useNavigate();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const profileQueryOptions = trpc.profile.getCurrent.queryOptions();
	const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
	const { data: profile = initialProfile } = useQuery({
		...profileQueryOptions,
		initialData: initialProfile,
		staleTime: 30_000,
	});

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented) return;
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setIsCommandPaletteOpen((open) => !open);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const commandShortcuts = useMemo<DashboardCommandShortcut[]>(
		() =>
			navItems.map((item) => ({
				id: `go-${item.to}`,
				label: `Go to ${item.label}`,
				description: `Open your ${item.label.toLowerCase()} dashboard page`,
				keywords: item.to,
				Icon: item.icon,
				onSelect: () => {
					navigate({ to: item.to });
				},
			})),
		[navigate],
	);

	const openCommandPalette = () => setIsCommandPaletteOpen(true);
	const handleSignOut = async () => {
		if (!navigationGuard.current()) return;
		const result = await authClient.signOut();
		if (result.error) {
			toast.error(result.error.message ?? "Could not sign out");
			return;
		}
		queryClient.clear();
		await navigate({ to: "/sign-in", ignoreBlocker: true });
	};

	const displayName = profile?.displayName?.trim() || profile?.username || "";
	const activeItem = navItems.find((item) =>
		isNavItemActive(item, location.pathname),
	);

	return (
		<NavigationGuardContext value={navigationGuard}>
			<div className="dashboard-workspace min-h-screen app-canvas md:flex">
				<aside className="dashboard-sidebar fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
					<div className="flex items-center justify-between gap-2 px-5 pt-5 pb-4">
						<a href="/" aria-label="llink.space home">
							<SiteBrand size="md" />
						</a>
					</div>
					<div className="px-3">
						<button
							type="button"
							onClick={openCommandPalette}
							className="flex h-10 w-full items-center gap-2.5 rounded-xl border border-sidebar-border bg-card px-3 text-left text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
						>
							<Search className="size-4" aria-hidden="true" />
							<span className="flex-1">Search or jump to…</span>
							<kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">
								⌘K
							</kbd>
							<span className="sr-only">Open command palette</span>
						</button>
					</div>

					<nav
						aria-label="Dashboard"
						className="flex-1 space-y-6 overflow-y-auto px-3 pt-6"
					>
						{navGroups.map((group) => (
							<div key={group.label}>
								<p className="eyebrow mb-1.5 px-3">{group.label}</p>
								<div className="space-y-0.5">
									{group.items.map((item) => {
										const active = isNavItemActive(item, location.pathname);
										return (
											<Link
												key={item.to}
												activeOptions={{ exact: item.exact }}
												aria-current={active ? "page" : undefined}
												to={item.to}
												className={cn(
													"dashboard-nav-link flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
													active
														? "bg-primary text-primary-foreground"
														: "text-foreground/75 hover:bg-sidebar-accent hover:text-foreground",
												)}
											>
												<item.icon className="size-4" aria-hidden="true" />
												{item.label}
											</Link>
										);
									})}
								</div>
							</div>
						))}
					</nav>

					<div className="space-y-1 p-3">
						{profile?.username && (
							<a
								href={`/u/${profile.username}`}
								target="_blank"
								rel="noopener noreferrer"
								className="group flex items-center gap-3 rounded-2xl border border-sidebar-border bg-card p-2.5 transition-colors hover:border-border-strong"
							>
								<span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-signal-soft font-display text-sm font-semibold text-signal-strong">
									{profile.avatarUrl ? (
										<img
											src={profile.avatarUrl}
											alt=""
											className="size-full object-cover"
										/>
									) : (
										displayName.charAt(0).toUpperCase()
									)}
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm font-semibold">
										View public page
									</span>
									<span className="block truncate font-mono text-[11px] text-muted-foreground">
										/u/{profile.username}
									</span>
								</span>
								<ArrowUpRight
									className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
									aria-hidden="true"
								/>
							</a>
						)}
						<button
							type="button"
							onClick={handleSignOut}
							className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-foreground"
						>
							<LogOut className="size-4" aria-hidden="true" />
							Sign out
						</button>
					</div>
				</aside>

				<div className="min-w-0 flex-1 md:ml-64">
					<header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/90 px-4 backdrop-blur-md md:hidden">
						<a href="/" aria-label="llink.space home">
							<SiteBrand size="sm" />
						</a>
						<span className="truncate font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
							{activeItem?.label}
						</span>
					</header>

					{/* Main content */}
					<main className="min-h-[calc(100dvh-3.5rem)] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:min-h-screen md:pb-0">
						<Outlet />
					</main>
				</div>

				<MobileDashboardNav
					items={navItems}
					pathname={location.pathname}
					username={profile?.username ?? null}
					onSearch={openCommandPalette}
					onSignOut={handleSignOut}
				/>
				<DashboardCommandPalette
					open={isCommandPaletteOpen}
					onOpenChange={setIsCommandPaletteOpen}
					shortcuts={commandShortcuts}
					username={profile?.username ?? null}
					onSignOut={() => void handleSignOut()}
				/>
			</div>
		</NavigationGuardContext>
	);
}
