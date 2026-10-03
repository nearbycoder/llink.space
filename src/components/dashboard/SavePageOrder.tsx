import { useMutation } from "@tanstack/react-query";
import { ArrowDownAZ } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { useTRPC } from "#/integrations/trpc/react";
import { LINK_SORTS, type LinkSort, sortDashboardView } from "#/lib/link-sort";
import type { DashboardLink, DashboardSection } from "./SectionedLinkBoard";
export function SavePageOrder({
	layout,
	sort,
	disabled,
	onSaved,
}: {
	layout: { links: DashboardLink[]; sections: DashboardSection[] };
	sort: LinkSort;
	disabled?: boolean;
	onSaved: () => Promise<void>;
}) {
	const trigger = useRef<HTMLButtonElement>(null);
	const [snapshot, setSnapshot] = useState<typeof layout | null>(null);
	const trpc = useTRPC();
	const mutation = useMutation(trpc.links.reorder.mutationOptions());
	const sorted = sortDashboardView(snapshot?.links ?? [], sort);
	const groups = [
		{ id: null, title: "Unsectioned" },
		...(snapshot?.sections ?? []),
	];
	const apply = async () => {
		if (!snapshot) return;
		try {
			await mutation.mutateAsync({
				sectionOrderIds: snapshot.sections.map((s) => s.id),
				unsectionedLinkIds: sorted.filter((l) => !l.sectionId).map((l) => l.id),
				sectionLinkOrders: snapshot.sections.map((s) => ({
					sectionId: s.id,
					linkIds: sorted.filter((l) => l.sectionId === s.id).map((l) => l.id),
				})),
			});
			await onSaved();
			setSnapshot(null);
			toast.success("Public page order saved");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Could not save this order",
			);
		}
	};
	return (
		<>
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
				<p className="text-sm text-muted-foreground">
					Sorted within sections for this view. Clear filters to save this order
					to your public page.
				</p>
				<Button
					ref={trigger}
					variant="outline"
					size="sm"
					disabled={disabled}
					onClick={() => setSnapshot(layout)}
				>
					<ArrowDownAZ data-icon="inline-start" /> Save as page order
				</Button>
			</div>
			<Dialog
				open={!!snapshot}
				onOpenChange={(open) => {
					if (!open && !mutation.isPending) setSnapshot(null);
				}}
			>
				<DialogContent
					onCloseAutoFocus={(event) => {
						event.preventDefault();
						trigger.current?.focus();
					}}
					className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
					onEscapeKeyDown={(e) => {
						if (mutation.isPending) e.preventDefault();
					}}
					onPointerDownOutside={(e) => {
						if (mutation.isPending) e.preventDefault();
					}}
				>
					<DialogHeader>
						<DialogTitle>Save {LINK_SORTS[sort]} to your page?</DialogTitle>
						<DialogDescription>
							This sets the order of every link within its section, including
							paused links. Section order stays the same.
						</DialogDescription>
					</DialogHeader>
					<div className="flex max-h-72 flex-col gap-4 overflow-y-auto">
						{groups.map((g) => {
							const items = sorted.filter((l) => l.sectionId === g.id);
							return items.length ? (
								<section key={g.id ?? "none"}>
									<h3 className="mb-2 text-sm font-semibold">{g.title}</h3>
									<ol className="list-inside list-decimal text-sm text-muted-foreground">
										{items.map((l) => (
											<li key={l.id} className="break-words py-1">
												{l.title}
											</li>
										))}
									</ol>
								</section>
							) : null;
						})}
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							disabled={mutation.isPending}
							onClick={() => setSnapshot(null)}
						>
							Cancel
						</Button>
						<Button disabled={mutation.isPending} onClick={() => void apply()}>
							{mutation.isPending ? "Saving…" : "Save page order"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
