import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { duplicateDestinations } from "#/lib/duplicate-links";
import type { DashboardLink } from "./SectionedLinkBoard";
export function DuplicateReview({
	links,
	onEdit,
}: {
	links: DashboardLink[];
	onEdit: (link: DashboardLink) => void;
}) {
	const [open, setOpen] = useState(false);
	const groups = duplicateDestinations(links);
	return (
		<>
			<Button size="sm" variant="outline" onClick={() => setOpen(true)}>
				Review duplicates{groups.length ? ` (${groups.length})` : ""}
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Duplicate destinations</DialogTitle>
						<DialogDescription>
							URLs are compared without UTM and ad-click identifiers. Other
							parameters and anchors stay distinct. Review each link before
							making changes.
						</DialogDescription>
					</DialogHeader>
					{!groups.length ? (
						<p className="text-sm">No duplicate destinations found.</p>
					) : (
						groups.map((group) => (
							<section
								key={group.url}
								className="rounded-xl border border-black/20 p-3"
							>
								<h3 className="break-all text-sm font-semibold">{group.url}</h3>
								<ul className="mt-3 space-y-2">
									{group.links.map((link) => (
										<li
											key={link.id}
											className="flex items-center justify-between gap-3"
										>
											<span className="min-w-0 break-words text-sm">
												{link.title}
											</span>
											<Button
												variant="outline"
												size="sm"
												aria-label={`Review ${link.title}`}
												onClick={() => {
													setOpen(false);
													onEdit(link);
												}}
											>
												Edit
											</Button>
										</li>
									))}
								</ul>
							</section>
						))
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
