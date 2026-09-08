import { Bookmark } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { normalizeHttpUrl } from "#/lib/security";
export function ReadingList({
	links,
	onRemove,
	onClear,
	onVisit,
	error,
}: {
	links: Array<{ id: string; title: string; url: string }>;
	onRemove: (id: string) => void;
	onClear: () => void;
	onVisit: (id: string) => void;
	error: string;
}) {
	return (
		<>
			{error && (
				<p role="status" className="order-last w-full text-xs">
					{error}
				</p>
			)}
			<Dialog>
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
					{links.length ? (
						<>
							<ul className="divide-y divide-current/15">
								{links.map((link) => (
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
