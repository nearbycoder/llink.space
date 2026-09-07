import { Link } from "@tanstack/react-router";
import {
	Check,
	ExternalLink,
	LogOut,
	type LucideIcon,
	Menu,
	Search,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { cn } from "#/lib/utils";

export interface DashboardNavItem {
	to:
		| "/dashboard"
		| "/dashboard/profile"
		| "/dashboard/analytics"
		| "/dashboard/design"
		| "/dashboard/health"
		| "/dashboard/audience"
		| "/dashboard/domains";
	label: string;
	icon: LucideIcon;
	exact: boolean;
}
const dockClass =
	"flex h-14 items-center rounded-2xl border-2 border-black bg-[#11110F] p-1 text-[#FFFCEF] shadow-[4px_4px_0_0_rgba(17,17,15,0.25)]";
const findClass =
	"inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold hover:bg-white/10 focus-visible:outline-[#F5FF7B]";
const toggleClass =
	"inline-flex h-11 w-12 items-center justify-center rounded-xl text-[#F5FF7B] hover:bg-white/10 focus-visible:outline-[#F5FF7B]";
const bottom = "calc(env(safe-area-inset-bottom, 0px) + 1rem)";

export function MobileDashboardNav({
	items,
	pathname,
	username,
	onSearch,
	onSignOut,
}: {
	items: DashboardNavItem[];
	pathname: string;
	username: string | null;
	onSearch: () => void;
	onSignOut: () => Promise<void>;
}) {
	const [open, setOpen] = useState(false);
	const [ready, setReady] = useState(false);
	const [keyboardOpen, setKeyboardOpen] = useState(false);
	const openingSearch = useRef(false);
	useEffect(() => {
		setReady(true);
		const desktop = window.matchMedia("(min-width: 768px)");
		const closeOnDesktop = () => {
			if (desktop.matches) setOpen(false);
		};
		desktop.addEventListener("change", closeOnDesktop);
		return () => desktop.removeEventListener("change", closeOnDesktop);
	}, []);
	useEffect(() => {
		const viewport = window.visualViewport;
		const update = () =>
			setKeyboardOpen(
				Boolean(
					viewport &&
						window.innerHeight - viewport.height > 150 &&
						document.activeElement?.matches(
							"input, textarea, [contenteditable=true]",
						),
				),
			);
		viewport?.addEventListener("resize", update);
		document.addEventListener("focusin", update);
		document.addEventListener("focusout", update);
		return () => {
			viewport?.removeEventListener("resize", update);
			document.removeEventListener("focusin", update);
			document.removeEventListener("focusout", update);
		};
	}, []);
	const search = () => {
		openingSearch.current = open;
		setOpen(false);
		onSearch();
	};
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<nav
				aria-label="Mobile dashboard controls"
				className={cn(
					"fixed left-1/2 z-40 -translate-x-1/2 md:hidden",
					(open || keyboardOpen) && "invisible",
				)}
				style={{ bottom }}
			>
				<div className={dockClass}>
					<button
						type="button"
						onClick={search}
						className={findClass}
						disabled={!ready}
						aria-label="Find pages and actions"
					>
						<Search className="size-4" aria-hidden="true" />
						Find
					</button>
					<span className="mx-1 h-6 w-px bg-white/20" aria-hidden="true" />
					<DialogTrigger asChild>
						<button
							type="button"
							className={toggleClass}
							disabled={!ready}
							aria-label="Open navigation menu"
						>
							<Menu className="size-5" aria-hidden="true" />
						</button>
					</DialogTrigger>
				</div>
			</nav>
			<DialogContent
				showCloseButton={false}
				className="top-auto flex max-h-[calc(100dvh-env(safe-area-inset-bottom,0px)-2rem)] translate-y-0 flex-col gap-3 border-0 bg-transparent p-0 shadow-none sm:max-w-sm"
				style={{ bottom }}
				onCloseAutoFocus={(event) => {
					if (openingSearch.current) {
						event.preventDefault();
						openingSearch.current = false;
					}
				}}
			>
				<div className="min-h-0 overflow-y-auto overscroll-contain rounded-2xl border-2 border-black bg-[#FFFCEF] p-2 shadow-[4px_4px_0_0_#11110F]">
					<div className="border-b border-black/15 px-3 pb-3 pt-2">
						<DialogTitle className="text-base font-bold">
							Your dashboard
						</DialogTitle>
						<DialogDescription className="mt-1 truncate text-xs">
							{username ? `@${username}` : "Pages and account"}
						</DialogDescription>
					</div>
					<nav aria-label="Dashboard pages" className="space-y-1 py-2">
						{items.map((item) => {
							const active = item.exact
								? pathname.replace(/\/$/, "") === item.to
								: pathname.startsWith(item.to);
							return (
								<Link
									key={item.to}
									to={item.to}
									activeOptions={{ exact: item.exact }}
									aria-current={active ? "page" : undefined}
									onClick={() => setOpen(false)}
									className={cn(
										"flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
										active
											? "bg-[#11110F] text-[#F5FF7B]"
											: "text-[#4B4B45] hover:bg-[#FFF7A8]",
									)}
								>
									<item.icon className="size-4 shrink-0" aria-hidden="true" />
									<span className="flex-1">{item.label}</span>
									{active && <Check className="size-4" aria-hidden="true" />}
								</Link>
							);
						})}
					</nav>
					<div className="border-t border-black/15 pt-2">
						{username && (
							<a
								href={`/u/${username}`}
								target="_blank"
								rel="noopener noreferrer"
								onClick={() => setOpen(false)}
								className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-[#FFF7A8]"
							>
								<ExternalLink className="size-4" aria-hidden="true" />
								View public page
							</a>
						)}
						<button
							type="button"
							onClick={() => void onSignOut()}
							className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-[#FFD9CF]"
						>
							<LogOut className="size-4" aria-hidden="true" />
							Sign out
						</button>
					</div>
				</div>
				<div className={cn(dockClass, "shrink-0 self-center")}>
					<button
						type="button"
						onClick={search}
						className={findClass}
						disabled={!ready}
						aria-label="Find pages and actions"
					>
						<Search className="size-4" aria-hidden="true" />
						Find
					</button>
					<span className="mx-1 h-6 w-px bg-white/20" aria-hidden="true" />
					<button
						type="button"
						onClick={() => setOpen(false)}
						className={toggleClass}
						aria-label="Close navigation menu"
					>
						<X className="size-5" aria-hidden="true" />
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
