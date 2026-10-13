import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LINK_ICON_OPTIONS } from "#/components/links/icon-options";
import { LinkCard } from "#/components/profile/LinkCard";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select } from "#/components/ui/select";
import { Switch } from "#/components/ui/switch";
import { Textarea } from "#/components/ui/textarea";
import { duplicateDestinations } from "#/lib/duplicate-links";
import { isLinkIconKey, LINK_ICON_KEYS } from "#/lib/link-icon-keys";
import { localDateInput, validSchedule } from "#/lib/link-publishing";
import {
	type PublishingPreset,
	publishingPreset,
} from "#/lib/publishing-presets";
import {
	isAllowedAvatarUrl,
	isSafeHttpUrl,
	normalizeHttpUrl,
	prepareHttpUrl,
} from "#/lib/security";
import { cn, DEFAULT_ICON_BG_COLOR, readableTextColor } from "#/lib/utils";
import { CampaignUrlBuilder } from "./CampaignUrlBuilder";
import { UrlCleanup } from "./UrlCleanup";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const UNSECTIONED = "__unsectioned";
const ICON_BG_PRESETS = [
	DEFAULT_ICON_BG_COLOR,
	"#FF5F1F",
	"#FFE27A",
	"#C9E4C5",
	"#B9E3EC",
	"#C7D2FF",
	"#F5C9D6",
	"#E9E5DC",
	"#FFFFFF",
	"#16140F",
];

const schema = z
	.object({
		title: z.string().min(1, "Title is required").max(100),
		url: z
			.string()
			.trim()
			.transform(prepareHttpUrl)
			.pipe(
				z
					.string()
					.max(2048)
					.refine(isSafeHttpUrl, "Enter a valid website URL")
					.transform((value) => normalizeHttpUrl(value) ?? value),
			),
		description: z.string().max(200).optional(),
		iconUrl: z.union([z.enum(LINK_ICON_KEYS), z.literal("")]).optional(),
		iconBgColor: z
			.string()
			.trim()
			.regex(/^#?[0-9A-Fa-f]{6}$/, "Use a valid hex color (e.g. #FFD9C7)")
			.transform((value) =>
				(value.startsWith("#") ? value : `#${value}`).toUpperCase(),
			),
		sectionId: z.union([z.string().uuid(), z.literal("")]).optional(),
		isActive: z.boolean(),
		featured: z.boolean().optional(),
		featureImageUrl: z
			.string()
			.max(500)
			.refine((v) => !v || isAllowedAvatarUrl(v), "Use a valid image URL")
			.optional(),
		ctaLabel: z.string().max(40).optional(),
		publishAt: z.string().optional(),
		expireAt: z.string().optional(),
	})
	.refine(validSchedule, {
		message: "End time must be after publish time",
		path: ["expireAt"],
	})
	.transform((value) => ({
		...value,
		publishAt: value.publishAt ? new Date(value.publishAt).toISOString() : null,
		expireAt: value.expireAt ? new Date(value.expireAt).toISOString() : null,
		featureImageUrl: value.featureImageUrl || null,
		ctaLabel: value.ctaLabel || null,
		iconUrl: value.iconUrl ? value.iconUrl : undefined,
		sectionId:
			value.sectionId === undefined
				? undefined
				: value.sectionId === ""
					? null
					: value.sectionId,
	}));

type LinkFormInput = z.input<typeof schema>;
export type LinkFormData = z.output<typeof schema>;

interface LinkFormProps {
	defaultValues?: Partial<LinkFormInput>;
	existingLinks?: Array<{ id: string; url: string; title: string }>;
	sections?: Array<{ id: string; title: string }>;
	onSubmit: (data: LinkFormData) => Promise<void>;
	onCancel: () => void;
	onAddAnother?: (data: LinkFormData) => Promise<boolean>;
	submitLabel?: string;
	cancelLabel?: string;
}

export function LinkForm({
	defaultValues,
	existingLinks = [],
	sections = [],
	onSubmit,
	onCancel,
	onAddAnother,
	submitLabel = "Save",
	cancelLabel = "Cancel",
}: LinkFormProps) {
	const normalizedDefaultIcon =
		typeof defaultValues?.iconUrl === "string" &&
		isLinkIconKey(defaultValues.iconUrl)
			? defaultValues.iconUrl
			: "";
	const normalizedDefaultIconBgColor =
		typeof defaultValues?.iconBgColor === "string" &&
		HEX_COLOR_REGEX.test(defaultValues.iconBgColor)
			? defaultValues.iconBgColor.toUpperCase()
			: DEFAULT_ICON_BG_COLOR;

	const {
		register,
		handleSubmit,
		watch,
		setValue,
		reset,
		setFocus,
		formState: { errors, isSubmitting },
	} = useForm<LinkFormInput, unknown, LinkFormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			title: "",
			url: "",
			description: "",
			sectionId: "",
			isActive: true,
			...defaultValues,
			featured: defaultValues?.featured ?? false,
			featureImageUrl: defaultValues?.featureImageUrl ?? "",
			ctaLabel: defaultValues?.ctaLabel ?? "",
			publishAt: localDateInput(defaultValues?.publishAt),
			expireAt: localDateInput(defaultValues?.expireAt),
			iconUrl: normalizedDefaultIcon,
			iconBgColor: normalizedDefaultIconBgColor,
		},
	});

	const [previewOpen, setPreviewOpen] = useState(false);
	const urlValue = watch("url") ?? "";
	const duplicates = useMemo(
		() =>
			duplicateDestinations([
				...existingLinks,
				{ id: "editor-candidate", url: prepareHttpUrl(urlValue), title: "" },
			])
				.find((group) =>
					group.links.some((link) => link.id === "editor-candidate"),
				)
				?.links.filter((link) => link.id !== "editor-candidate") ?? [],
		[existingLinks, urlValue],
	);
	const isActive = watch("isActive");
	const titleValue = watch("title") ?? "";
	const descriptionValue = watch("description") ?? "";
	const selectedIcon = watch("iconUrl");
	const selectedIconBgColor = watch("iconBgColor");
	const selectedSectionId = watch("sectionId");
	const selectedIconTileBg = selectedIconBgColor ?? DEFAULT_ICON_BG_COLOR;
	const selectedIconTileText = readableTextColor(selectedIconTileBg);
	const titleId = useId();
	const publishingId = useId();
	const urlId = useId();
	const sectionId = useId();
	const descriptionId = useId();
	const isActiveId = useId();

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
			<div className="space-y-1.5">
				<Label htmlFor={titleId}>Title</Label>
				<Input
					id={titleId}
					placeholder="e.g. My Website"
					maxLength={100}
					{...register("title")}
				/>
				<p
					className="text-right text-[11px] font-semibold text-muted-foreground"
					aria-live="polite"
				>
					{titleValue.length}/100
				</p>
				{errors.title && (
					<p className="text-xs text-destructive">{errors.title.message}</p>
				)}
			</div>

			<div className="space-y-1.5">
				<Label htmlFor={urlId}>URL</Label>
				<Input
					id={urlId}
					type="text"
					inputMode="url"
					autoCapitalize="none"
					autoCorrect="off"
					spellCheck={false}
					placeholder="example.com"
					{...register("url")}
				/>
				<p className="text-[11px] text-muted-foreground">
					HTTPS is added automatically when you omit it.
				</p>
				{errors.url && (
					<p className="text-xs text-destructive">{errors.url.message}</p>
				)}
			</div>

			{duplicates.length > 0 && (
				<p
					role="status"
					className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground"
				>
					This destination already appears in {duplicates.length} link
					{duplicates.length === 1 ? "" : "s"}:{" "}
					{duplicates
						.slice(0, 3)
						.map((link) => link.title)
						.join(", ")}
					{duplicates.length > 3 ? "…" : ""}. You can still save a separate
					entry.
				</p>
			)}
			<UrlCleanup
				url={watch("url") ?? ""}
				onApply={(url) =>
					setValue("url", url, { shouldDirty: true, shouldValidate: true })
				}
			/>
			<CampaignUrlBuilder
				url={watch("url") ?? ""}
				onApply={(url) =>
					setValue("url", url, { shouldDirty: true, shouldValidate: true })
				}
			/>

			{sections.length > 0 && (
				<div className="space-y-1.5">
					<Label htmlFor={sectionId}>Section</Label>
					<input type="hidden" {...register("sectionId")} />
					<Select
						id={sectionId}
						value={selectedSectionId || UNSECTIONED}
						onValueChange={(value) =>
							setValue("sectionId", value === UNSECTIONED ? "" : value, {
								shouldDirty: true,
								shouldTouch: true,
								shouldValidate: true,
							})
						}
						options={[
							{ value: UNSECTIONED, label: "Unsectioned" },
							...sections.map((section) => ({
								value: section.id,
								label: section.title,
							})),
						]}
					/>
					{errors.sectionId && (
						<p className="text-xs text-destructive">
							{errors.sectionId.message}
						</p>
					)}
				</div>
			)}

			<div className="space-y-2">
				<Label>Icon</Label>
				<input type="hidden" {...register("iconUrl")} />
				<div className="grid max-h-56 grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-6">
					{LINK_ICON_OPTIONS.map((option) => {
						const isSelected = selectedIcon === option.key;
						return (
							<button
								key={option.key}
								type="button"
								onClick={() =>
									setValue("iconUrl", option.key, {
										shouldDirty: true,
										shouldTouch: true,
										shouldValidate: true,
									})
								}
								className={cn(
									"flex flex-col items-center justify-center gap-1 rounded-xl border p-2 text-[10px] font-medium transition-all",
									isSelected
										? "border-foreground ring-2 ring-foreground/15"
										: "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground",
								)}
								style={
									isSelected
										? {
												backgroundColor: selectedIconTileBg,
												color: selectedIconTileText,
											}
										: undefined
								}
								aria-label={`Select ${option.label} icon`}
							>
								<option.Icon className="h-4 w-4 shrink-0" />
								<span className="truncate">{option.label}</span>
							</button>
						);
					})}
				</div>
				{errors.iconUrl && (
					<p className="text-xs text-destructive">{errors.iconUrl.message}</p>
				)}
				{selectedIcon && (
					<p className="text-xs text-muted-foreground">
						Selected icon:{" "}
						<span className="font-semibold text-foreground">
							{
								LINK_ICON_OPTIONS.find((option) => option.key === selectedIcon)
									?.label
							}
						</span>
					</p>
				)}
			</div>

			<div className="space-y-2">
				<Label>Icon background</Label>
				<input type="hidden" {...register("iconBgColor")} />
				<div className="flex flex-wrap gap-2">
					{ICON_BG_PRESETS.map((color) => (
						<button
							key={color}
							type="button"
							aria-label={`Use ${color} as icon background`}
							onClick={() =>
								setValue("iconBgColor", color, {
									shouldDirty: true,
									shouldTouch: true,
									shouldValidate: true,
								})
							}
							className={cn(
								"h-7 w-7 rounded-full border border-black/10 transition-transform hover:scale-110",
								selectedIconBgColor?.toUpperCase() === color.toUpperCase() &&
									"ring-2 ring-foreground ring-offset-2 ring-offset-card",
							)}
							style={{ backgroundColor: color }}
						/>
					))}
				</div>
				<div className="flex items-center gap-2">
					<input
						type="color"
						value={selectedIconBgColor}
						onChange={(event) =>
							setValue("iconBgColor", event.target.value.toUpperCase(), {
								shouldDirty: true,
								shouldTouch: true,
								shouldValidate: true,
							})
						}
						className="h-10 w-12 cursor-pointer rounded-xl border border-border bg-card p-1 shadow-sm"
					/>
					<Input
						value={selectedIconBgColor}
						onChange={(event) =>
							setValue("iconBgColor", event.target.value, {
								shouldDirty: true,
								shouldTouch: true,
							})
						}
						onBlur={(event) =>
							setValue("iconBgColor", event.target.value.toUpperCase(), {
								shouldDirty: true,
								shouldTouch: true,
								shouldValidate: true,
							})
						}
						placeholder="#FFD9C7"
						maxLength={7}
						className="font-mono"
					/>
				</div>
				{errors.iconBgColor && (
					<p className="text-xs text-destructive">
						{errors.iconBgColor.message}
					</p>
				)}
			</div>

			<div className="space-y-1.5">
				<Label htmlFor={descriptionId}>Description (optional)</Label>
				<Textarea
					id={descriptionId}
					placeholder="A short description of this link"
					className="resize-none"
					rows={2}
					maxLength={200}
					{...register("description")}
				/>
				<p
					className="text-right text-[11px] font-semibold text-muted-foreground"
					aria-live="polite"
				>
					{descriptionValue.length}/200
				</p>
				{errors.description && (
					<p className="text-xs text-destructive">
						{errors.description.message}
					</p>
				)}
			</div>

			<details
				className="rounded-xl border border-border p-3"
				onToggle={(event) => setPreviewOpen(event.currentTarget.open)}
			>
				<summary className="cursor-pointer text-sm font-semibold">
					Preview link card
				</summary>
				<p className="my-2 text-xs text-muted-foreground">
					Live content preview. Your page’s theme applies when published.
				</p>
				{previewOpen && (
					<div inert data-card-preview="true">
						<LinkCard
							id="editor-preview"
							title={titleValue || "Your link title"}
							url={prepareHttpUrl(watch("url") || "")}
							description={descriptionValue}
							iconUrl={selectedIcon}
							iconBgColor={
								HEX_COLOR_REGEX.test(selectedIconBgColor ?? "")
									? selectedIconBgColor
									: DEFAULT_ICON_BG_COLOR
							}
							featured={watch("featured")}
							featureImageUrl={watch("featureImageUrl")}
							ctaLabel={watch("ctaLabel")}
						/>
					</div>
				)}
			</details>
			<div className="flex items-center gap-3">
				<Switch
					id={isActiveId}
					checked={isActive}
					onCheckedChange={(val) => setValue("isActive", val)}
				/>
				<Label htmlFor={isActiveId} className="cursor-pointer">
					{isActive ? "Active" : "Hidden"}
				</Label>
			</div>

			<fieldset className="space-y-3 rounded-xl border border-border/20 p-4">
				<legend className="px-2 text-sm font-semibold">
					Publishing & spotlight
				</legend>
				<label className="flex items-center gap-2 text-sm">
					<input type="checkbox" {...register("featured")} />
					Feature this link (replaces the current spotlight)
				</label>
				{watch("featured") && (
					<>
						<label
							htmlFor={`${publishingId}-featureImageUrl`}
							className="block text-sm"
						>
							Feature image URL
							<Input
								id={`${publishingId}-featureImageUrl`}
								{...register("featureImageUrl")}
								placeholder="https://…"
							/>
						</label>
						{errors.featureImageUrl && (
							<p role="alert">{errors.featureImageUrl.message}</p>
						)}
						<label
							htmlFor={`${publishingId}-ctaLabel`}
							className="block text-sm"
						>
							Call to action
							<Input
								id={`${publishingId}-ctaLabel`}
								{...register("ctaLabel")}
								placeholder="Explore more"
							/>
						</label>
					</>
				)}
				<div className="block text-sm font-medium">
					<label htmlFor={`${publishingId}-shortcut`}>Schedule shortcut</label>
					<Select
						id={`${publishingId}-shortcut`}
						aria-label="Schedule shortcut"
						value=""
						placeholder="Choose a schedule…"
						className="mt-1.5"
						onValueChange={(value) => {
							const next = publishingPreset(value as PublishingPreset);
							setValue("publishAt", next.publishAt, { shouldDirty: true });
							setValue("expireAt", next.expireAt, {
								shouldDirty: true,
								shouldValidate: true,
							});
						}}
						options={[
							{ value: "tomorrow", label: "Publish tomorrow at 9am" },
							{ value: "week", label: "Live now, hide in 7 days" },
							{ value: "none", label: "No schedule" },
						]}
					/>
				</div>
				<p className="text-xs text-muted-foreground">
					Shortcuts replace both dates below. Hidden links stay hidden until you
					activate them.
				</p>
				<div className="grid gap-3 sm:grid-cols-2">
					<label htmlFor={`${publishingId}-publishAt`} className="text-sm">
						Publish at
						<Input
							type="datetime-local"
							id={`${publishingId}-publishAt`}
							{...register("publishAt")}
						/>
					</label>
					<label htmlFor={`${publishingId}-expireAt`} className="text-sm">
						Hide at
						<Input
							type="datetime-local"
							id={`${publishingId}-expireAt`}
							{...register("expireAt")}
						/>
					</label>
				</div>
				<p className="text-xs text-muted-foreground">
					Times use your device’s timezone. Leave blank for no schedule. Paused
					links stay hidden.
				</p>
				{errors.expireAt && <p role="alert">{errors.expireAt.message}</p>}
			</fieldset>
			<div className="sticky -bottom-6 z-10 -mx-1 flex flex-col-reverse gap-2 border-t border-border bg-card px-1 py-4 sm:flex-row">
				<Button
					type="submit"
					disabled={isSubmitting}
					className="w-full sm:w-auto"
				>
					{isSubmitting ? "Saving…" : submitLabel}
				</Button>
				{onAddAnother && (
					<Button
						type="button"
						variant="outline"
						disabled={isSubmitting}
						onClick={handleSubmit(async (data) => {
							if (await onAddAnother(data)) {
								reset({
									title: "",
									url: "",
									description: "",
									sectionId: selectedSectionId ?? "",
									isActive: true,
									iconUrl: "",
									iconBgColor: DEFAULT_ICON_BG_COLOR,
									featured: false,
									featureImageUrl: "",
									ctaLabel: "",
									publishAt: "",
									expireAt: "",
								});
								requestAnimationFrame(() => setFocus("title"));
							}
						})}
					>
						Save & add another
					</Button>
				)}
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isSubmitting}
					className="w-full sm:w-auto"
				>
					{cancelLabel}
				</Button>
			</div>
		</form>
	);
}
