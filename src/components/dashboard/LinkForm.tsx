import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "#/components/ui/button"
import { cn } from "#/lib/utils"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import { Textarea } from "#/components/ui/textarea"
import { Switch } from "#/components/ui/switch"
import { LINK_ICON_OPTIONS } from "#/components/links/icon-options"
import { LINK_ICON_KEYS, isLinkIconKey } from "#/lib/link-icon-keys"

const schema = z.object({
	title: z.string().min(1, "Title is required").max(100),
	url: z.string().url("Must be a valid URL"),
	description: z.string().max(200).optional(),
	iconUrl: z.preprocess(
		(value) => {
			if (typeof value !== "string") return value
			const trimmed = value.trim()
			if (trimmed.length === 0) return undefined
			return isLinkIconKey(trimmed) ? trimmed : undefined
		},
		z.enum(LINK_ICON_KEYS).optional(),
	),
	isActive: z.boolean(),
})

export type LinkFormData = z.infer<typeof schema>

interface LinkFormProps {
	defaultValues?: Partial<LinkFormData>
	onSubmit: (data: LinkFormData) => Promise<void>
	onCancel: () => void
	submitLabel?: string
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
			: ""

	const {
		register,
		handleSubmit,
		watch,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<LinkFormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			title: "",
			url: "",
			description: "",
			isActive: true,
			...defaultValues,
			iconUrl: normalizedDefaultIcon,
		},
	})

	const isActive = watch("isActive")
	const selectedIcon = watch("iconUrl")

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
			<div className="space-y-1.5">
				<Label htmlFor="title">Title</Label>
				<Input id="title" placeholder="e.g. My Website" {...register("title")} />
				{errors.title && (
					<p className="text-xs text-[#B42318]">{errors.title.message}</p>
				)}
			</div>

			<div className="space-y-1.5">
				<Label htmlFor="url">URL</Label>
				<Input
					id="url"
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
					{LINK_ICON_OPTIONS.map((option) => (
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
								selectedIcon === option.key
									? "border-black bg-[#F5FF7B] text-[#11110F] shadow-[2px_2px_0_0_#11110F]"
									: "border-black/20 bg-white text-[#4B4B45] hover:border-black hover:bg-[#FFFCEF]",
							)}
							aria-label={`Select ${option.label} icon`}
						>
							<option.Icon className="h-4 w-4 shrink-0" />
							<span className="truncate">{option.label}</span>
						</button>
					))}
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

			<div className="space-y-1.5">
				<Label htmlFor="description">Description (optional)</Label>
				<Textarea
					id="description"
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
					id="isActive"
					checked={isActive}
					onCheckedChange={(val) => setValue("isActive", val)}
				/>
				<Label htmlFor="isActive" className="cursor-pointer">
					{isActive ? "Active" : "Hidden"}
				</Label>
			</div>

			<div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
				<Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
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
	)
}
