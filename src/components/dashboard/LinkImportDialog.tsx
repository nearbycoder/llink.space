import { useMutation } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
import { csvLinksToText } from "#/lib/csv-link-import";
import { bookmarkLinksToText, parseLinkCatalog } from "#/lib/link-catalog";
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
	const [reading, setReading] = useState(false);
	const fileRead = useRef(0);
	const [text, setText] = useState("");
	const [format, setFormat] = useState<"text" | "json">("text");
	const trpc = useTRPC();
	const mutation = useMutation(trpc.links.importLinks.mutationOptions());
	const catalogMutation = useMutation(
		trpc.links.importCatalog.mutationOptions(),
	);
	const pending = reading || mutation.isPending || catalogMutation.isPending;
	const preview = useMemo(() => {
		if (format === "text") return parseLinkImport(text, existingUrls);
		if (!text.trim()) return { links: [], duplicates: 0, errors: [] };
		try {
			return { ...parseLinkCatalog(text, existingUrls), errors: [] };
		} catch (error) {
			return {
				links: [],
				duplicates: 0,
				errors: [
					{
						line: 0,
						message: error instanceof Error ? error.message : "Invalid catalog",
					},
				],
			};
		}
	}, [text, existingUrls, format]);

	async function handleImport() {
		try {
			const result = await (format === "json"
				? catalogMutation
				: mutation
			).mutateAsync({ text });
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
					if (!pending) setOpen(next);
				}}
			>
				<DialogContent
					className="max-h-[calc(100svh-2rem)] overflow-y-auto overscroll-contain sm:max-w-lg"
					onEscapeKeyDown={(e) => {
						if (pending) e.preventDefault();
					}}
					onPointerDownOutside={(e) => {
						if (pending) e.preventDefault();
					}}
				>
					<DialogHeader>
						<DialogTitle>Import links</DialogTitle>
						<DialogDescription>
							Paste up to 50 URLs, one per line. Add a title in the second
							column when pasting from a spreadsheet, or paste Markdown links
							such as [My site](https://example.com). Headings are skipped;
							imported titles and URLs appear below.
						</DialogDescription>
					</DialogHeader>
					<form
						className="space-y-4"
						onSubmit={(event) => {
							event.preventDefault();
							if (!pending && preview.links.length && !preview.errors.length)
								void handleImport();
						}}
					>
						<label className="block text-sm font-semibold">
							CSV file, bookmark HTML, or JSON
							<input
								type="file"
								accept=".csv,.html,.htm,.json,text/csv,text/html,application/json"
								disabled={pending}
								className="mt-2 block w-full text-sm"
								onChange={async (event) => {
									const file = event.target.files?.[0];
									event.target.value = "";
									if (!file) return;
									const readVersion = ++fileRead.current;
									setText("");
									setReading(true);
									try {
										if (file.size > 256000)
											throw new Error("Choose a file smaller than 256 KB.");
										const source = await file.text();
										if (readVersion !== fileRead.current) return;
										if (/\.json$/i.test(file.name)) {
											setFormat("json");
											setText(source);
										} else {
											setFormat("text");
											setText(
												/\.html?$/i.test(file.name)
													? bookmarkLinksToText(source)
													: csvLinksToText(source),
											);
										}
									} catch (error) {
										if (readVersion !== fileRead.current) return;
										toast.error(
											error instanceof Error
												? error.message
												: "Could not read this file",
										);
									} finally {
										if (readVersion === fileRead.current) setReading(false);
									}
								}}
							/>
							<span className="mt-1 block text-xs font-normal">
								CSV and bookmarks import titles and URLs. JSON also preserves
								descriptions and icons. All start as paused drafts in
								Unsectioned; folder and section labels are not restored. Up to
								50 links per import.
							</span>
						</label>
						<div className="space-y-2">
							<label className="block text-sm font-medium">
								Paste format
								<select
									aria-label="Import format"
									value={format}
									disabled={pending}
									onChange={(e) => {
										setFormat(e.target.value as typeof format);
										setText("");
									}}
									className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2 text-base sm:text-sm"
								>
									<option value="text">URLs / Markdown</option>
									<option value="json">JSON catalog</option>
								</select>
							</label>
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
								disabled={pending}
								aria-describedby="import-preview"
								aria-invalid={preview.errors.length > 0}
							/>
						</div>
						<div
							id="import-preview"
							className="rounded-xl border border-border bg-card p-3 text-sm"
							aria-live="polite"
						>
							<p className="font-semibold">
								{preview.links.length} new links · {preview.duplicates}{" "}
								duplicates skipped
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								Imported links start paused in Unsectioned. Review and publish
								them from your dashboard.
							</p>
							{preview.errors.length > 0 ? (
								<ul className="mt-2 space-y-1 text-xs text-destructive">
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
									pending || !preview.links.length || !!preview.errors.length
								}
							>
								{pending ? "Importing…" : "Import as drafts"}
							</Button>
							<Button
								type="button"
								variant="outline"
								disabled={pending}
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
