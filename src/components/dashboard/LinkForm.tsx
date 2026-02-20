import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { Switch } from "#/components/ui/switch";
import { LINK_ICON_OPTIONS } from "#/components/links/icon-options";
import { LINK_ICON_KEYS, isLinkIconKey } from "#/lib/link-icon-keys";
import { isSafeHttpUrl, normalizeHttpUrl } from "#/lib/security";
import { useId } from "react";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const DEFAULT_ICON_BG_COLOR = "#F5FF7B";
const ICON_BG_PRESETS = [
	"#F5FF7B",
	"#8AE1E7",
	"#F2B7E2",
	"#FF8A4C",
	"#A8E6A1",
	"#7CC6FF",
	"#FFD9CF",
	"#D9D5FF",
	"#FCE78B",
	"#F8F8F4",
];

function getReadableTextColor(hexColor: string) {
	const normalized = hexColor.replace("#", "");
	if (normalized.length !== 6) return "#11110F";
	const red = Number.parseInt(normalized.slice(0, 2), 16);
	const green = Number.parseInt(normalized.slice(2, 4), 16);
	const blue = Number.parseInt(normalized.slice(4, 6), 16);
	const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
	return luminance < 140 ? "#FFFCEF" : "#11110F";
}

const schema = z
	.object({
		title: z.string().min(1, "Title is required").max(100),
		url: z
			.string()
			.trim()
			.max(2048)
			.refine(isSafeHttpUrl, "URL must start with http:// or https://")
			.transform((value) => normalizeHttpUrl(value) ?? value),
		description: z.string().max(200).optional(),
		iconUrl: z.union([z.enum(LINK_ICON_KEYS), z.literal("")]).optional(),
		iconBgColor: z
			.string()
			.trim()
			.regex(/^#?[0-9A-Fa-f]{6}$/, "Use a valid hex color (e.g. #F5FF7B)")
			.transform((value) =>
				(value.startsWith("#") ? value : `#${value}`).toUpperCase(),
			),
		isActive: z.boolean(),
	})
	.transform((value) => ({
		...value,
		iconUrl: value.iconUrl ? value.iconUrl : undefined,
	}));

type LinkFormInput = z.input<typeof schema>;
export type LinkFormData = z.output<typeof schema>;

interface LinkFormProps {
	defaultValues?: Partial<LinkFormInput>;
	onSubmit: (data: LinkFormData) => Promise<void>;
	onCancel: () => void;
	submitLabel?: string;
}

export function LinkForm({
	defaultValues,
	onSubmit,
	onCancel,
	submitLabel = "Save",
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
		formState: { errors, isSubmitting },
	} = useForm<LinkFormInput, unknown, LinkFormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			title: "",
			url: "",
			description: "",
			isActive: true,
			...defaultValues,
			iconUrl: normalizedDefaultIcon,
			iconBgColor: normalizedDefaultIconBgColor,
		},
	});

	const isActive = watch("isActive");
	const selectedIcon = watch("iconUrl");
	const selectedIconBgColor = watch("iconBgColor");
	const selectedIconTileBg = selectedIconBgColor ?? DEFAULT_ICON_BG_COLOR;
	const selectedIconTileText = getReadableTextColor(selectedIconTileBg);
	const titleId = useId();
	const urlId = useId();
	const descriptionId = useId();
	const isActiveId = useId();

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
			<div className="space-y-1.5">
				<Label htmlFor={titleId}>Title</Label>
				<Input
					id={titleId}
					placeholder="e.g. My Website"
					{...register("title")}
				/>
				{errors.title && (
					<p className="text-xs text-[#B42318]">{errors.title.message}</p>
				)}
			</div>

			<div className="space-y-1.5">
				<Label htmlFor={urlId}>URL</Label>
				<Input
					id={urlId}
					type="url"
					placeholder="https://example.com"
					{...register("url")}
				/>
				{errors.url && (
					<p className="text-xs text-[#B42318]">{errors.url.message}</p>
				)}
			</div>

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
									"flex flex-col items-center justify-center gap-1 rounded-lg border-2 p-2 text-[10px] font-medium transition-all",
									isSelected
										? "border-black shadow-[2px_2px_0_0_#11110F]"
										: "border-black/20 bg-white text-[#4B4B45] hover:border-black hover:bg-[#FFFCEF]",
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
					<p className="text-xs text-[#B42318]">{errors.iconUrl.message}</p>
				)}
				{selectedIcon && (
					<p className="text-xs text-[#6A675C]">
						Selected icon:{" "}
						<span className="font-semibold text-[#11110F]">
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
								"h-7 w-7 rounded-full border-2 border-black shadow-[2px_2px_0_0_#11110F] transition-transform hover:-translate-y-0.5",
								selectedIconBgColor?.toUpperCase() === color.toUpperCase() &&
									"ring-2 ring-black ring-offset-2 ring-offset-[#FFFCEF]",
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
						className="h-10 w-12 cursor-pointer rounded-xl border-2 border-black bg-white p-1 shadow-[2px_2px_0_0_#11110F]"
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
						placeholder="#F5FF7B"
						maxLength={7}
						className="font-mono"
					/>
				</div>
				{errors.iconBgColor && (
					<p className="text-xs text-[#B42318]">{errors.iconBgColor.message}</p>
				)}
			</div>

			<div className="space-y-1.5">
				<Label htmlFor={descriptionId}>Description (optional)</Label>
				<Textarea
					id={descriptionId}
					placeholder="A short description of this link"
					className="resize-none"
					rows={2}
					{...register("description")}
				/>
				{errors.description && (
					<p className="text-xs text-[#B42318]">{errors.description.message}</p>
				)}
			</div>

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

			<div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
				<Button
					type="submit"
					disabled={isSubmitting}
					className="w-full sm:w-auto"
				>
					{isSubmitting ? "Saving…" : submitLabel}
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					className="w-full sm:w-auto"
				>
					Cancel
				</Button>
			</div>
		</form>
	);
}
