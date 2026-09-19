import { Bookmark } from "lucide-react";
import { useId, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { downloadFile } from "#/lib/download-file";
import { buildLinkMarkdown } from "#/lib/markdown-export";
import { matchesSearch, searchTerms } from "#/lib/search-terms";
import { normalizeHttpUrl } from "#/lib/security";
export function ReadingList({
	links,
	onRemove,
	onClear,
	onUndo,
	canUndo,
	onVisit,
	error,
}: {
	links: Array<{ id: string; title: string; url: string }>;
	onRemove: (id: string) => void;
	onClear: () => void;
	onUndo: () => void;
	canUndo: boolean;
	onVisit: (id: string) => void;
	error: string;
}) {
	const searchId = useId();
	const [query, setQuery] = useState("");
	const terms = searchTerms(query);
	const filtered = links.filter((link) =>
		matchesSearch([link.title, link.url], terms),
	);
	return (
		<>
			{error && (
				<p role="status" className="order-last w-full text-xs">
					{error}
				</p>
			)}
			<Dialog
				onOpenChange={(open) => {
					if (!open) setQuery("");
				}}
			>
				<DialogTrigger asChild>
					<button
						type="button"
						className="public-profile-tool"
						aria-label={`Saved links · ${links.length}`}
					>
						<Bookmark size={16} aria-hidden="true" />
						<span>
							Saved links{links.length > 0 ? ` · ${links.length}` : ""}
						</span>
					</button>
				</DialogTrigger>
				<DialogContent
					data-public-profile-dialog
					className="max-h-[85dvh] overflow-y-auto"
				>
					<DialogHeader>
						<DialogTitle>Your saved links</DialogTitle>
						<DialogDescription>
							Tap the bookmark on any link to keep it for later. Your reading
							list stays in this browser, with no account needed. Links that are
							no longer public disappear from this list.
						</DialogDescription>
					</DialogHeader>
					{canUndo && (
						<div
							role="status"
							className="flex items-center justify-between gap-3 rounded-lg border border-current/20 p-2 text-sm"
						>
							<span>Reading list updated.</span>
							<button
								type="button"
								onClick={onUndo}
								className="min-h-11 px-3 font-semibold underline"
							>
								Undo removal
							</button>
						</div>
					)}
					{links.length ? (
						<>
							<button
								type="button"
								className="min-h-11 rounded-lg border border-current/30 px-3 text-sm"
								onClick={() =>
									downloadFile(
										buildLinkMarkdown(
											links.map((link) => ({
												...link,
												description: null,
												sectionId: null,
											})),
											[],
										).replace(/^# My links/, "# Saved links"),
										"saved-links.md",
										"text/markdown;charset=utf-8",
									)
								}
							>
								Download saved links
							</button>
							<label htmlFor={searchId} className="block text-sm">
								Search saved links
								<Input
									id={searchId}
									value={query}
									onChange={(event) => setQuery(event.target.value)}
									placeholder="Search titles or destinations"
									maxLength={500}
									className="mt-1"
								/>
							</label>
							<p className="text-xs" role="status">
								Showing {filtered.length} of {links.length} saved links
							</p>
							{filtered.length === 0 && (
								<p className="text-sm">No saved links match this search.</p>
							)}
							<ul className="divide-y divide-current/15">
								{filtered.map((link) => (
									<li
										key={link.id}
										className="flex items-center justify-between gap-3 py-2"
									>
										<a
											href={normalizeHttpUrl(link.url) ?? undefined}
											target="_blank"
											rel="noopener noreferrer nofollow ugc"
											onClick={() => onVisit(link.id)}
											className="min-w-0 break-words py-2 text-sm underline underline-offset-4"
										>
											{link.title}
										</a>
										<button
											type="button"
											aria-label={`Remove ${link.title} from reading list`}
											className="min-h-11 shrink-0 px-2 text-xs font-semibold"
											onClick={() => onRemove(link.id)}
										>
											Remove
										</button>
									</li>
								))}
							</ul>
							<button
								type="button"
								className="mt-2 min-h-11 rounded-lg border border-current/30 px-3 text-sm"
								onClick={onClear}
							>
								Clear reading list
							</button>
						</>
					) : (
						<p className="text-sm">No saved links yet.</p>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
