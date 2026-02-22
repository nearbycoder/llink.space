import { useQuery } from "@tanstack/react-query";
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
	LayoutDashboard,
	LogOut,
	User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	DashboardCommandPalette,
	type DashboardCommandShortcut,
} from "#/components/dashboard/DashboardCommandPalette";
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
	component: DashboardLayout,
});

type DashboardPath =
	| "/dashboard"
	| "/dashboard/profile"
	| "/dashboard/analytics";

const navItems: Array<{
	to: DashboardPath;
	label: string;
	icon: typeof LayoutDashboard;
	exact: boolean;
}> = [
	{ to: "/dashboard", label: "Links", icon: LayoutDashboard, exact: true },
	{ to: "/dashboard/profile", label: "Profile", icon: User, exact: false },
	{
		to: "/dashboard/analytics",
		label: "Analytics",
		icon: BarChart3,
		exact: false,
	},
];

function DashboardLayout() {
	const { initialProfile } = Route.useLoaderData();
	const location = useLocation();
	const navigate = useNavigate();
	const trpc = useTRPC();
	const profileQueryOptions = trpc.profile.getCurrent.queryOptions();
	const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
	const { data: profile = initialProfile } = useQuery({
		...profileQueryOptions,
		initialData: initialProfile,
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
	const handleSignOut = () => {
		void authClient.signOut();
	};

	return (
		<div className="min-h-screen kinetic-gradient md:flex">
			{/* Sidebar */}
			<aside className="hidden md:flex w-60 bg-[#FFFCEF]/95 backdrop-blur-sm border-r-2 border-black flex-col fixed inset-y-0 left-0 z-10">
				<div className="p-5 border-b-2 border-black">
					<div className="flex items-center justify-between gap-2">
						<a href="/">
							<SiteBrand size="md" />
						</a>
						<button
							type="button"
							onClick={openCommandPalette}
							className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-black/35 bg-white px-2 text-xs font-semibold text-[#11110F] transition-colors hover:bg-[#FFF7A8]"
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
								to={item.to}
								className={cn(
									"flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors border-2 border-transparent",
									active
										? "bg-[#11110F] text-[#F5FF7B] border-black shadow-[2px_2px_0_0_#11110F]"
										: "text-[#4B4B45] hover:bg-[#FFF7A8] hover:text-[#11110F] hover:border-black",
								)}
							>
								<item.icon className="w-4 h-4" />
								{item.label}
							</Link>
						);
					})}
				</nav>

				<div className="p-3 border-t-2 border-black space-y-1">
					{profile?.username && (
						<a
							href={`/u/${profile.username}`}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-[#4B4B45] border-2 border-transparent hover:bg-[#FFF7A8] hover:text-[#11110F] hover:border-black transition-colors"
						>
							<ExternalLink className="w-4 h-4" />
							View public page
						</a>
					)}
					<button
						type="button"
						onClick={handleSignOut}
						className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-[#4B4B45] border-2 border-transparent hover:bg-[#FFD9CF] hover:text-[#11110F] hover:border-black transition-colors w-full text-left"
					>
						<LogOut className="w-4 h-4" />
						Sign out
					</button>
				</div>
			</aside>

			<div className="flex-1 md:ml-60">
				<header className="md:hidden border-b-2 border-black bg-[#FFFCEF]/95 backdrop-blur-sm">
					<div className="flex items-center justify-between px-4 py-3">
						<a href="/">
							<SiteBrand size="sm" />
						</a>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={openCommandPalette}
								className="rounded-lg border-2 border-black bg-white px-2.5 py-1.5 text-xs font-semibold text-[#11110F] shadow-[2px_2px_0_0_#11110F]"
							>
								<Command className="h-3.5 w-3.5" />
								<span className="sr-only">Open command menu</span>
							</button>
							{profile?.username && (
								<a
									href={`/u/${profile.username}`}
									target="_blank"
									rel="noopener noreferrer"
									className="rounded-lg border-2 border-black bg-[#F5FF7B] px-2.5 py-1.5 text-xs font-semibold text-[#11110F] shadow-[2px_2px_0_0_#11110F]"
								>
									View page
								</a>
							)}
							<button
								type="button"
								onClick={handleSignOut}
								className="rounded-lg border-2 border-black bg-[#FFD9CF] px-2.5 py-1.5 text-xs font-semibold text-[#11110F] shadow-[2px_2px_0_0_#11110F]"
							>
								Sign out
							</button>
						</div>
					</div>

					<nav className="px-3 pb-3">
						<div className="flex gap-2 overflow-x-auto pb-1">
							{navItems.map((item) => {
								const active = item.exact
									? location.pathname === item.to
									: location.pathname.startsWith(item.to);
								return (
									<Link
										key={`mobile-${item.to}`}
										to={item.to}
										className={cn(
											"shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border-2 border-transparent",
											active
												? "bg-[#11110F] text-[#F5FF7B] border-black shadow-[2px_2px_0_0_#11110F]"
												: "bg-white text-[#4B4B45] hover:bg-[#FFF7A8] hover:text-[#11110F] hover:border-black",
										)}
									>
										<item.icon className="w-3.5 h-3.5" />
										{item.label}
									</Link>
								);
							})}
						</div>
					</nav>
				</header>

				{/* Main content */}
				<main className="min-h-[calc(100vh-120px)] md:min-h-screen">
					<Outlet />
				</main>
			</div>

			<DashboardCommandPalette
				open={isCommandPaletteOpen}
				onOpenChange={setIsCommandPaletteOpen}
				shortcuts={commandShortcuts}
				username={profile?.username ?? null}
				onSignOut={handleSignOut}
			/>
		</div>
	);
}
