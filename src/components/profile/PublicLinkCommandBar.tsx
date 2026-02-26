import { Command, CornerDownLeft, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { normalizeHttpUrl } from "#/lib/security";

interface PublicLinkItem {
	id: string;
	title: string;
	url: string;
	description?: string | null;
	sectionTitle?: string | null;
}

interface PublicLinkCommandBarProps {
	links: PublicLinkItem[];
	onVisitLink?: (linkId: string) => void;
}

function isEditableElement(target: EventTarget | null) {
	const node = target as HTMLElement | null;
	if (!node) return false;
	const tagName = node.tagName.toLowerCase();
	return (
		tagName === "input" ||
		tagName === "textarea" ||
		tagName === "select" ||
		node.isContentEditable
	);
}

function hostFromUrl(url: string) {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}

export function PublicLinkCommandBar({
	links,
	onVisitLink,
}: PublicLinkCommandBarProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [isApplePlatform, setIsApplePlatform] = useState(false);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const resultButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const platform = window.navigator.platform || window.navigator.userAgent;
		setIsApplePlatform(/mac|iphone|ipad|ipod/i.test(platform));
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (!(event.metaKey || event.ctrlKey)) return;
			if (event.key.toLowerCase() !== "k") return;
			if (isEditableElement(event.target)) return;

			event.preventDefault();
			setOpen((previous) => !previous);
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	useEffect(() => {
		if (!open) {
			setQuery("");
			setSelectedIndex(0);
			return;
		}

		setSelectedIndex(0);
		const timer = window.setTimeout(() => {
			inputRef.current?.focus();
		}, 0);
		return () => window.clearTimeout(timer);
	}, [open]);

	const results = useMemo(() => {
		const normalized = query.trim().toLowerCase();
		if (!normalized) return links;

		return links.filter((link) => {
			const haystack =
				`${link.title} ${link.description ?? ""} ${link.url} ${link.sectionTitle ?? ""}`.toLowerCase();
			return haystack.includes(normalized);
		});
	}, [links, query]);

	const hasResults = results.length > 0;

	useEffect(() => {
		if (!open || !hasResults) return;
		const activeButton = resultButtonRefs.current[selectedIndex];
		activeButton?.scrollIntoView({
			block: "nearest",
			inline: "nearest",
		});
	}, [open, hasResults, selectedIndex]);

	useEffect(() => {
		if (!hasResults) return;
		setSelectedIndex((index) => Math.min(index, results.length - 1));
	}, [hasResults, results.length]);

	const openLink = (link: PublicLinkItem) => {
		const safeUrl = normalizeHttpUrl(link.url);
		if (!safeUrl || typeof window === "undefined") return;

		onVisitLink?.(link.id);
		window.open(safeUrl, "_blank", "noopener,noreferrer");
		setOpen(false);
	};

	return (
		<>
			<div className="mb-4 rounded-xl border-2 border-black bg-[#FFF7A8]/95 p-3 shadow-[3px_3px_0_0_#11110F]">
				<div className="flex items-center justify-between gap-3">
					<div className="min-w-0">
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4F4A00]">
							Quick jump
						</p>
						<p className="mt-0.5 truncate text-xs text-[#5B5648]">
							Search across {links.length} links
						</p>
					</div>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => setOpen(true)}
						className="shrink-0 bg-[#FFFCEF]"
					>
						<Search className="h-3.5 w-3.5" />
						<span>{isApplePlatform ? "Command + K" : "Ctrl + K"}</span>
					</Button>
				</div>
			</div>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent
					className="max-w-xl overflow-hidden rounded-2xl p-0"
					showCloseButton={false}
				>
					<DialogHeader className="border-b-2 border-black bg-[#FFF7A8] px-5 py-4">
						<DialogTitle className="flex items-center gap-2 text-base">
							<Command className="h-4 w-4" />
							Quick jump
						</DialogTitle>
						<DialogDescription className="text-[#5B5648]">
							Find a link instantly and open it in a new tab.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-3 p-4">
						<Input
							ref={inputRef}
							value={query}
							onChange={(event) => {
								setQuery(event.target.value);
								setSelectedIndex(0);
							}}
							onKeyDown={(event) => {
								if (event.key === "ArrowDown") {
									event.preventDefault();
									setSelectedIndex((index) =>
										Math.min(index + 1, Math.max(results.length - 1, 0)),
									);
									return;
								}
								if (event.key === "ArrowUp") {
									event.preventDefault();
									setSelectedIndex((index) => Math.max(index - 1, 0));
									return;
								}
								if (event.key === "Enter" && hasResults) {
									event.preventDefault();
									openLink(results[selectedIndex] ?? results[0]);
									return;
								}
								if (event.key === "Escape") {
									event.preventDefault();
									setOpen(false);
								}
							}}
							placeholder="Search by title, description, or domain..."
							aria-label="Search links"
						/>

						<div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
							{hasResults ? (
								results.map((link, index) => (
									<button
										key={link.id}
										type="button"
										ref={(node) => {
											resultButtonRefs.current[index] = node;
										}}
										onMouseEnter={() => setSelectedIndex(index)}
										onClick={() => openLink(link)}
										className={`w-full rounded-xl border-2 px-3 py-2 text-left transition-colors ${
											index === selectedIndex
												? "border-black bg-[#11110F] text-[#F5FF7B]"
												: "border-black/80 bg-[#FFFCEF] text-[#11110F] hover:bg-[#F8F8F4]"
										}`}
									>
										<div className="flex items-start justify-between gap-2">
											<p className="min-w-0 truncate text-sm font-semibold">
												{link.title}
											</p>
											{link.sectionTitle?.trim() ? (
												<span
													className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${
														index === selectedIndex
															? "border-[#F5FF7B]/70 text-[#F5FF7B]"
															: "border-black/35 bg-[#F5FF7B]/55 text-[#4F4A00]"
													}`}
												>
													{link.sectionTitle}
												</span>
											) : null}
										</div>
										<p
											className={`truncate text-xs ${
												index === selectedIndex
													? "text-[#DDFBFD]"
													: "text-[#5B5648]"
											}`}
										>
											{link.description?.trim() || hostFromUrl(link.url)}
										</p>
									</button>
								))
							) : (
								<div className="rounded-xl border-2 border-dashed border-black/40 bg-white/70 p-4 text-center">
									<p className="text-sm font-medium text-[#11110F]">
										No matching links
									</p>
									<p className="mt-1 text-xs text-[#5B5648]">
										Try a different keyword.
									</p>
								</div>
							)}
						</div>

						<div className="flex items-center justify-between border-t border-black/15 pt-2 text-xs text-[#5B5648]">
							<span>
								Use {isApplePlatform ? "Command" : "Ctrl"} + K to open anytime
							</span>
							<span className="inline-flex items-center gap-1">
								<CornerDownLeft className="h-3 w-3" />
								Open
							</span>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
