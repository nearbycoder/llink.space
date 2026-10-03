import { ArrowUpRight, Code2, Copy, Download } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";
import { Textarea } from "#/components/ui/textarea";
import { downloadFile } from "#/lib/download-file";
import { buildProfileBadge } from "#/lib/profile-badge";
import { useClientReady } from "#/lib/use-client-ready";
export function ProfileBadge({ username }: { username: string }) {
	const ready = useClientReady();
	const trigger = useRef<HTMLButtonElement>(null);
	const id = useId();
	const [url, setUrl] = useState("");
	const [label, setLabel] = useState("Find all my links");
	const [appearance, setAppearance] = useState<"dark" | "light">("dark");
	let code = "";
	try {
		if (url) code = buildProfileBadge({ url, label, appearance });
	} catch {
		/* The label is still being edited. */
	}
	return (
		<section className="kinetic-panel mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
			<div>
				<h2 className="text-base font-semibold">A little link to everything</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Add a page badge to your website or portfolio.
				</p>
			</div>
			<Button
				ref={trigger}
				variant="outline"
				disabled={!ready}
				onClick={() =>
					setUrl(`${window.location.origin}/u/${encodeURIComponent(username)}`)
				}
			>
				<Code2 data-icon="inline-start" /> Website badge
			</Button>
			<Dialog
				open={!!url}
				onOpenChange={(open) => {
					if (!open) setUrl("");
				}}
			>
				<DialogContent
					onCloseAutoFocus={(event) => {
						event.preventDefault();
						trigger.current?.focus();
					}}
					className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
				>
					<DialogHeader>
						<DialogTitle>Put your page on your website</DialogTitle>
						<DialogDescription>
							Customize a badge, then copy its HTML into your website editor.
						</DialogDescription>
					</DialogHeader>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor={`${id}-label`}>Badge label</FieldLabel>
							<Input
								id={`${id}-label`}
								value={label}
								maxLength={60}
								onChange={(e) => setLabel(e.target.value)}
								aria-invalid={!label.trim()}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor={`${id}-appearance`}>
								Badge appearance
							</FieldLabel>
							<NativeSelect
								id={`${id}-appearance`}
								value={appearance}
								onChange={(e) =>
									setAppearance(e.target.value as typeof appearance)
								}
							>
								<NativeSelectOption value="dark">Forest</NativeSelectOption>
								<NativeSelectOption value="light">Paper</NativeSelectOption>
							</NativeSelect>
						</Field>
						<Field>
							<FieldLabel>Preview</FieldLabel>
							<div className="flex justify-center rounded-xl border border-border bg-muted/40 p-8">
								<a
									href={url}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold"
									style={{
										background: appearance === "dark" ? "#263b25" : "#fff",
										color: appearance === "dark" ? "#fff" : "#263b25",
										borderColor: appearance === "dark" ? "#263b25" : "#dfe3da",
									}}
								>
									{label.trim() || "Your label"}
									<ArrowUpRight size={16} />
								</a>
							</div>
						</Field>
						<Field>
							<FieldLabel htmlFor={`${id}-html`}>HTML code</FieldLabel>
							<Textarea id={`${id}-html`} readOnly value={code} rows={4} />
							<FieldDescription>
								The badge links directly to your public page. No script or
								external assets are needed.
							</FieldDescription>
						</Field>
					</FieldGroup>
					<div className="flex flex-wrap gap-2">
						<Button
							disabled={!code}
							onClick={async () => {
								try {
									await navigator.clipboard.writeText(code);
									toast.success("Badge HTML copied");
								} catch {
									toast.error("Select the HTML to copy it manually");
								}
							}}
						>
							<Copy data-icon="inline-start" /> Copy badge HTML
						</Button>
						<Button
							variant="outline"
							disabled={!code}
							onClick={() =>
								downloadFile(code, `llink-${username}-badge.html`, "text/html")
							}
						>
							<Download data-icon="inline-start" /> Download badge
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</section>
	);
}
