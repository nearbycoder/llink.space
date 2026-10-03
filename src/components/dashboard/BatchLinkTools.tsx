import { useMutation } from "@tanstack/react-query";
import { Wand2 } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { LINK_ICON_OPTIONS } from "#/components/links/icon-options";
import { LinkIcon } from "#/components/links/LinkIcon";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
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
import { Switch } from "#/components/ui/switch";
import { Textarea } from "#/components/ui/textarea";
import { useTRPC } from "#/integrations/trpc/react";
import {
	BATCH_TOOL_LABELS,
	type BatchLink,
	type BatchOperation,
	previewBatchLinks,
} from "#/lib/batch-link-tools";
import type { LinkIconKey } from "#/lib/link-icon-keys";

type EditableLink = BatchLink & { updatedAt: Date | string | null };
function dateValue(value: string) {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime()))
		throw new Error("Enter a valid local date and time.");
	return date.toISOString();
}
export function BatchLinkTools({
	links,
	disabled,
	onSaved,
}: {
	links: EditableLink[];
	disabled?: boolean;
	onSaved: () => Promise<void>;
}) {
	const trigger = useRef<HTMLButtonElement>(null);
	const id = useId();
	const [snapshot, setSnapshot] = useState<EditableLink[] | null>(null);
	const [kind, setKind] = useState<BatchOperation["kind"]>("duplicate");
	const [find, setFind] = useState("");
	const [replacement, setReplacement] = useState("");
	const [description, setDescription] = useState("");
	const [icon, setIcon] = useState<LinkIconKey | "none">("globe");
	const [color, setColor] = useState("#EDF3DF");
	const [start, setStart] = useState("");
	const [end, setEnd] = useState("");
	const [activate, setActivate] = useState(false);
	const trpc = useTRPC();
	const mutation = useMutation(trpc.links.batchEdit.mutationOptions());
	const review = useMemo(() => {
		try {
			const operation: BatchOperation =
				kind === "schedule"
					? {
							kind,
							publishAt: dateValue(start),
							expireAt: dateValue(end),
							activate,
						}
					: kind === "description"
						? { kind, description }
						: kind === "style"
							? {
									kind,
									iconUrl: icon === "none" ? null : icon,
									iconBgColor: color,
								}
							: kind === "title" || kind === "url"
								? { kind, find, replacement }
								: { kind };
			const rows = previewBatchLinks(snapshot ?? [], operation);
			return { operation, rows, error: null };
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Review your changes.";
			return {
				operation: null,
				rows: [],
				error: message.startsWith("[")
					? "Fill in the fields with valid values before applying changes."
					: message,
			};
		}
	}, [
		snapshot,
		kind,
		find,
		replacement,
		description,
		icon,
		color,
		start,
		end,
		activate,
	]);
	const changedCount = review.rows.filter((r) => r.changed).length;
	const submit = async () => {
		if (!snapshot || !review.operation || !changedCount) return;
		try {
			const result = await mutation.mutateAsync({
				selection: snapshot.map((l) => ({
					id: l.id,
					updatedAt: l.updatedAt ? new Date(l.updatedAt).toISOString() : null,
				})),
				operation: review.operation,
			});
			await onSaved();
			setSnapshot(null);
			toast.success(
				`${result.count} links ${kind === "duplicate" ? "duplicated as paused drafts" : "updated"}`,
			);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Could not apply changes",
			);
		}
	};
	return (
		<>
			<Button
				ref={trigger}
				size="sm"
				variant="outline"
				disabled={disabled || !links.length || links.length > 50}
				onClick={() => setSnapshot(links.map((l) => ({ ...l })))}
			>
				<Wand2 data-icon="inline-start" /> Batch tools
			</Button>
			{links.length > 50 && (
				<p className="text-sm text-muted-foreground">
					Select up to 50 links for batch tools.
				</p>
			)}
			<Dialog
				open={snapshot !== null}
				onOpenChange={(open) => {
					if (!open && !mutation.isPending) setSnapshot(null);
				}}
			>
				<DialogContent
					onCloseAutoFocus={(event) => {
						event.preventDefault();
						trigger.current?.focus();
					}}
					className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl"
					onEscapeKeyDown={(e) => {
						if (mutation.isPending) e.preventDefault();
					}}
					onPointerDownOutside={(e) => {
						if (mutation.isPending) e.preventDefault();
					}}
				>
					<DialogHeader>
						<DialogTitle>Make changes together</DialogTitle>
						<DialogDescription>
							Review all {snapshot?.length ?? 0} selected links. Changes are
							saved together after validation.
						</DialogDescription>
					</DialogHeader>
					<fieldset disabled={mutation.isPending} className="min-w-0">
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor={`${id}-tool`}>Action</FieldLabel>
								<NativeSelect
									id={`${id}-tool`}
									value={kind}
									onChange={(e) =>
										setKind(e.target.value as BatchOperation["kind"])
									}
								>
									{Object.entries(BATCH_TOOL_LABELS).map(([key, label]) => (
										<NativeSelectOption key={key} value={key}>
											{label}
										</NativeSelectOption>
									))}
								</NativeSelect>
							</Field>
							{(kind === "title" || kind === "url") && (
								<>
									<Field>
										<FieldLabel htmlFor={`${id}-find`}>Find text</FieldLabel>
										<Input
											id={`${id}-find`}
											value={find}
											onChange={(e) => setFind(e.target.value)}
											maxLength={kind === "title" ? 100 : 2048}
										/>
										<FieldDescription>
											Match exact text, including capitalization. Every
											occurrence is replaced.
										</FieldDescription>
									</Field>
									<Field>
										<FieldLabel htmlFor={`${id}-replace`}>
											Replace with
										</FieldLabel>
										<Input
											id={`${id}-replace`}
											value={replacement}
											onChange={(e) => setReplacement(e.target.value)}
											maxLength={kind === "title" ? 100 : 2048}
										/>
									</Field>
								</>
							)}
							{kind === "description" && (
								<Field>
									<FieldLabel htmlFor={`${id}-description`}>
										New description
									</FieldLabel>
									<Textarea
										id={`${id}-description`}
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										maxLength={200}
									/>
									<FieldDescription>
										An empty description removes it from every selected link.
									</FieldDescription>
								</Field>
							)}
							{kind === "style" && (
								<>
									<Field>
										<FieldLabel htmlFor={`${id}-icon`}>Link icon</FieldLabel>
										<NativeSelect
											id={`${id}-icon`}
											value={icon}
											onChange={(e) => setIcon(e.target.value as typeof icon)}
										>
											<NativeSelectOption value="none">
												No icon
											</NativeSelectOption>
											{LINK_ICON_OPTIONS.map((o) => (
												<NativeSelectOption key={o.key} value={o.key}>
													{o.label}
												</NativeSelectOption>
											))}
										</NativeSelect>
									</Field>
									<Field>
										<FieldLabel htmlFor={`${id}-color`}>
											Icon background
										</FieldLabel>
										<Input
											id={`${id}-color`}
											type="color"
											value={color}
											onChange={(e) => setColor(e.target.value)}
										/>
									</Field>
								</>
							)}
							{kind === "schedule" && (
								<>
									<Field>
										<FieldLabel htmlFor={`${id}-start`}>
											Publish time
										</FieldLabel>
										<Input
											id={`${id}-start`}
											type="datetime-local"
											value={start}
											onChange={(e) => setStart(e.target.value)}
										/>
										<FieldDescription>
											Times use your local time zone. Empty fields clear
											existing schedules.
										</FieldDescription>
									</Field>
									<Field>
										<FieldLabel htmlFor={`${id}-end`}>Expiry time</FieldLabel>
										<Input
											id={`${id}-end`}
											type="datetime-local"
											value={end}
											onChange={(e) => setEnd(e.target.value)}
										/>
									</Field>
									<Field orientation="horizontal">
										<Switch
											id={`${id}-activate`}
											checked={activate}
											onCheckedChange={setActivate}
										/>
										<FieldLabel htmlFor={`${id}-activate`}>
											Activate links for this schedule
										</FieldLabel>
									</Field>
								</>
							)}
							{kind === "duplicate" && (
								<p className="text-sm text-muted-foreground">
									Copies keep their sections and card content. They start paused
									with no featured status or schedule.
								</p>
							)}
							{kind === "clean" && (
								<p className="text-sm text-muted-foreground">
									Remove UTM, gclid, fbclid and msclkid parameters. Other
									parameters and fragments stay in place.
								</p>
							)}
						</FieldGroup>
					</fieldset>
					<section
						aria-label="Batch change preview"
						className="rounded-xl border border-border bg-muted/40 p-4"
					>
						<p className="mb-3 text-sm font-semibold" aria-live="polite">
							{changedCount} links will{" "}
							{kind === "duplicate" ? "be duplicated" : "change"}
						</p>
						{review.error ? (
							<p role="alert" className="text-sm text-destructive">
								{review.error}
							</p>
						) : (
							<ul className="flex max-h-64 flex-col gap-3 overflow-y-auto">
								{review.rows.map(({ before, after, changed }) => (
									<li
										key={before.id}
										className="border-t border-border pt-3 text-sm first:border-0 first:pt-0"
									>
										<p className="font-medium break-words">
											{before.title}
											{!changed && (
												<span className="ml-2 text-xs text-muted-foreground">
													Unchanged
												</span>
											)}
										</p>
										{kind === "style" ? (
											<div className="mt-2 flex items-center gap-3">
												<span>Before</span>
												<LinkIcon
													iconUrl={before.iconUrl}
													iconBgColor={before.iconBgColor ?? "#EDF3DF"}
												/>
												<span>After</span>
												<LinkIcon
													iconUrl={after.iconUrl}
													iconBgColor={after.iconBgColor ?? "#EDF3DF"}
												/>
											</div>
										) : kind === "url" || kind === "clean" ? (
											<>
												<p className="mt-1 break-all text-xs text-muted-foreground">
													Before: {before.url}
												</p>
												<p className="mt-1 break-all text-xs">
													After: {after.url}
												</p>
											</>
										) : kind === "description" ? (
											<>
												<p className="mt-1 break-words text-xs text-muted-foreground">
													Before: {before.description || "None"}
												</p>
												<p className="mt-1 break-words text-xs">
													After: {after.description || "None"}
												</p>
											</>
										) : kind === "schedule" ? (
											<>
												<p className="mt-1 text-xs text-muted-foreground">
													Before:{" "}
													{before.publishAt
														? new Date(before.publishAt).toLocaleString()
														: "No start"}{" "}
													→{" "}
													{before.expireAt
														? new Date(before.expireAt).toLocaleString()
														: "No expiry"}
												</p>
												<p className="mt-1 text-xs">
													After:{" "}
													{after.publishAt
														? new Date(after.publishAt).toLocaleString()
														: "No start"}{" "}
													→{" "}
													{after.expireAt
														? new Date(after.expireAt).toLocaleString()
														: "No expiry"}{" "}
													· {after.isActive ? "Active" : "Paused"}
												</p>
											</>
										) : (
											<p className="mt-1 break-words text-xs">
												After: {after.title}
											</p>
										)}
									</li>
								))}
							</ul>
						)}
					</section>
					<DialogFooter>
						<Button
							variant="outline"
							disabled={mutation.isPending}
							onClick={() => setSnapshot(null)}
						>
							Cancel
						</Button>
						<Button
							disabled={mutation.isPending || !!review.error || !changedCount}
							onClick={() => void submit()}
						>
							{mutation.isPending
								? "Saving…"
								: `Apply to ${changedCount} links`}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
