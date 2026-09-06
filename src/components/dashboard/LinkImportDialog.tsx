import { useMutation } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { useTRPC } from "#/integrations/trpc/react";
import { parseLinkImport } from "#/lib/link-import";

export function LinkImportDialog({
	existingUrls,
	onImported,
	disabled,
}: {
	existingUrls: string[];
	onImported: () => Promise<void>;
	disabled?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [text, setText] = useState("");
	const trpc = useTRPC();
	const mutation = useMutation(trpc.links.importLinks.mutationOptions());
	const preview = useMemo(
		() => parseLinkImport(text, existingUrls),
		[text, existingUrls],
	);

	async function handleImport() {
		try {
			const result = await mutation.mutateAsync({ text });
			setOpen(false);
			setText("");
			toast.success(`${result.count} links imported as drafts`);
			await onImported();
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Could not import links. Try again.",
			);
		}
	}

	return (
		<>
			<Button
				type="button"
				size="sm"
				variant="outline"
				disabled={disabled}
				onClick={() => setOpen(true)}
			>
				<Upload className="h-4 w-4" aria-hidden="true" /> Import links
			</Button>
			<Dialog
				open={open}
				onOpenChange={(next) => {
					if (!mutation.isPending) setOpen(next);
				}}
			>
				<DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto overscroll-contain sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Import links</DialogTitle>
						<DialogDescription>
							Paste up to 50 URLs, one per line. Add a title in the second
							column when pasting from a spreadsheet.
						</DialogDescription>
					</DialogHeader>
					<form
						className="space-y-4"
						onSubmit={(event) => {
							event.preventDefault();
							if (
								!mutation.isPending &&
								preview.links.length &&
								!preview.errors.length
							)
								void handleImport();
						}}
					>
						<div className="space-y-2">
							<Label htmlFor="import-links">Website URLs</Label>
							<Textarea
								id="import-links"
								name="links"
								value={text}
								onChange={(event) => setText(event.target.value)}
								maxLength={110000}
								rows={6}
								spellCheck={false}
								autoComplete="off"
								placeholder={"example.com/portfolio\nexample.com/newsletter"}
								disabled={mutation.isPending}
								aria-describedby="import-preview"
								aria-invalid={preview.errors.length > 0}
							/>
						</div>
						<div
							id="import-preview"
							className="rounded-xl border-2 border-black bg-[#FFFCEF] p-3 text-sm"
							aria-live="polite"
						>
							<p className="font-semibold">
								{preview.links.length} new links · {preview.duplicates}{" "}
								duplicates skipped
							</p>
							<p className="mt-1 text-xs text-[#4B4B45]">
								Imported links start paused in Unsectioned. Review and publish
								them from your dashboard.
							</p>
							{preview.errors.length > 0 ? (
								<ul className="mt-2 space-y-1 text-xs text-[#B42318]">
									{preview.errors.slice(0, 5).map((error) => (
										<li key={error.line}>
											{error.line ? `Line ${error.line}: ` : ""}
											{error.message}
										</li>
									))}
								</ul>
							) : (
								<ul className="mt-2 max-h-36 space-y-1 overflow-y-auto">
									{preview.links.slice(0, 50).map((link) => (
										<li key={link.url} className="truncate text-xs">
											<span className="font-semibold">{link.title}</span> —{" "}
											{link.url}
										</li>
									))}
								</ul>
							)}
						</div>
						<div className="flex flex-wrap gap-2">
							<Button
								type="submit"
								disabled={
									mutation.isPending ||
									!preview.links.length ||
									!!preview.errors.length
								}
							>
								{mutation.isPending ? "Importing…" : "Import as drafts"}
							</Button>
							<Button
								type="button"
								variant="outline"
								disabled={mutation.isPending}
								onClick={() => setOpen(false)}
							>
								Cancel
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}
