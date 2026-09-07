import { Link } from "@tanstack/react-router";
import {
	Check,
	ExternalLink,
	LogOut,
	type LucideIcon,
	Search,
} from "lucide-react";
import { Popover } from "radix-ui";
import { useEffect, useId, useRef, useState } from "react";
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
	const titleId = useId();
	const descriptionId = useId();
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
		<Popover.Root open={open} onOpenChange={setOpen}>
			<div
				aria-hidden="true"
				data-state={open ? "open" : "closed"}
				className="mobile-nav-scrim fixed inset-0 z-30 touch-none bg-black/40 md:hidden"
			/>
			<Popover.Anchor asChild>
				<nav
					aria-label="Mobile dashboard controls"
					className={cn(
						"fixed left-1/2 z-40 -translate-x-1/2 md:hidden",
						keyboardOpen && !open && "invisible",
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
						<Popover.Trigger asChild>
							<button
								type="button"
								className={toggleClass}
								disabled={!ready}
								aria-label={
									open ? "Close navigation menu" : "Open navigation menu"
								}
							>
								<span className="mobile-menu-icon" aria-hidden="true">
									<span />
									<span />
								</span>
							</button>
						</Popover.Trigger>
					</div>
				</nav>
			</Popover.Anchor>
			<Popover.Portal>
				<Popover.Content
					side="top"
					align="center"
					sideOffset={12}
					collisionPadding={16}
					aria-labelledby={titleId}
					aria-describedby={descriptionId}
					className="mobile-nav-panel z-40 w-[calc(100vw-2rem)] max-w-sm overflow-y-auto overscroll-contain rounded-2xl border-2 border-black bg-[#FFFCEF] p-2 text-[#11110F] shadow-[4px_4px_0_0_#11110F] outline-none md:hidden"
					style={{
						maxHeight: "var(--radix-popover-content-available-height)",
						transformOrigin: "var(--radix-popover-content-transform-origin)",
					}}
					onInteractOutside={(event) => {
						// Keep Find reachable without closing and reopening competing surfaces.
						const target = event.target;
						if (
							target instanceof Element &&
							target.closest('[aria-label="Mobile dashboard controls"]')
						)
							event.preventDefault();
					}}
					onCloseAutoFocus={(event) => {
						if (openingSearch.current) {
							event.preventDefault();
							openingSearch.current = false;
						}
					}}
				>
					<div className="border-b border-black/15 px-3 pb-3 pt-2">
						<h2 id={titleId} className="text-base font-bold">
							Your dashboard
						</h2>
						<p
							id={descriptionId}
							className="mt-1 truncate text-xs text-[#6A675C]"
						>
							{username ? `@${username}` : "Pages and account"}
						</p>
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
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
