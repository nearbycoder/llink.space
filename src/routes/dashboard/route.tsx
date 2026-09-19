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
	BarChart3,
	Command,
	ExternalLink,
	Globe,
	HeartPulse,
	LayoutDashboard,
	LogOut,
	Palette,
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
	{ to: "/dashboard/profile", label: "Profile", icon: User, exact: false },
	{
		to: "/dashboard/design",
		label: "Design studio",
		icon: Palette,
		exact: false,
	},
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

	return (
		<NavigationGuardContext value={navigationGuard}>
			<div className="dashboard-workspace min-h-screen kinetic-gradient md:flex">
				{/* Sidebar */}
				<aside className="dashboard-sidebar hidden md:flex w-60 bg-card/95 backdrop-blur-sm border-r border-border flex-col fixed inset-y-0 left-0 z-10">
					<div className="p-5 border-b border-border">
						<div className="flex items-center justify-between gap-2">
							<a href="/">
								<SiteBrand size="md" />
							</a>
							<button
								type="button"
								onClick={openCommandPalette}
								className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-black/35 bg-white px-2 text-xs font-semibold text-[#11110F] transition-colors hover:bg-accent"
							>
								<Command className="h-4 w-4" />
								<span className="leading-none text-xs font-semibold text-[#11110F]">
									K
								</span>
								<span className="sr-only">Open command palette</span>
							</button>
						</div>
					</div>

					<nav className="flex-1 p-3 space-y-1">
						{navItems.map((item) => {
							const active = item.exact
								? location.pathname === item.to
								: location.pathname.startsWith(item.to);
							return (
								<Link
									key={item.to}
									aria-current={active ? "page" : undefined}
									to={item.to}
									className={cn(
										"dashboard-nav-link flex min-h-11 items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors border border-transparent",
										active
											? "bg-accent text-[#273B1D]"
											: "text-[#4B4B45] hover:bg-accent hover:text-[#11110F] hover:border-foreground/25",
									)}
								>
									<item.icon className="w-4 h-4" />
									{item.label}
								</Link>
							);
						})}
					</nav>

					<div className="p-3 border-t border-border space-y-1">
						{profile?.username && (
							<a
								href={`/u/${profile.username}`}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-[#4B4B45] border-2 border-transparent hover:bg-accent hover:text-[#11110F] hover:border-foreground/25 transition-colors"
							>
								<ExternalLink className="w-4 h-4" />
								View public page
							</a>
						)}
						<button
							type="button"
							onClick={handleSignOut}
							className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-[#4B4B45] border-2 border-transparent hover:bg-[#FFD9CF] hover:text-[#11110F] hover:border-foreground/25 transition-colors w-full text-left"
						>
							<LogOut className="w-4 h-4" />
							Sign out
						</button>
					</div>
				</aside>

				<div className="flex-1 md:ml-60">
					<header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-card/95 px-4 md:hidden">
						<a href="/">
							<SiteBrand size="sm" />
						</a>
						<span className="truncate text-xs font-semibold text-[#4B4B45]">
							{
								navItems.find((item) =>
									item.exact
										? location.pathname.replace(/\/$/, "") === item.to
										: location.pathname.startsWith(item.to),
								)?.label
							}
						</span>
					</header>

					{/* Main content */}
					<main className="min-h-[calc(100dvh-4rem)] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:min-h-screen md:pb-0">
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
