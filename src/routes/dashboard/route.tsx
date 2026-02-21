import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useLocation,
} from "@tanstack/react-router";
import {
	BarChart3,
	ExternalLink,
	LayoutDashboard,
	LogOut,
	User,
} from "lucide-react";
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

const navItems = [
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
	const trpc = useTRPC();
	const profileQueryOptions = trpc.profile.getCurrent.queryOptions();
	const { data: profile = initialProfile } = useQuery({
		...profileQueryOptions,
		initialData: initialProfile,
	});

	return (
		<div className="min-h-screen kinetic-gradient md:flex">
			{/* Sidebar */}
			<aside className="hidden md:flex w-60 bg-[#FFFCEF]/95 backdrop-blur-sm border-r-2 border-black flex-col fixed inset-y-0 left-0 z-10">
				<div className="p-5 border-b-2 border-black">
					<a href="/">
						<SiteBrand size="md" />
					</a>
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
						onClick={() => void authClient.signOut()}
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
								onClick={() => void authClient.signOut()}
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
		</div>
	);
}
