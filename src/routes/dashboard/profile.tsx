import { createFileRoute } from "@tanstack/react-router"
import { useTRPC } from "#/integrations/trpc/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "#/components/ui/button"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import { Textarea } from "#/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar"
import { useEffect, useRef, useState, type ChangeEvent } from "react"

export const Route = createFileRoute("/dashboard/profile")({
	component: ProfilePage,
})

function isValidAvatarUrl(value: string) {
	if (value.startsWith("/uploads/")) {
		return true
	}
	try {
		const url = new URL(value)
		return url.protocol === "https:" || url.protocol === "http:"
	} catch {
		return false
	}
}

const schema = z.object({
	displayName: z.string().min(1, "Name is required").max(100),
	bio: z.string().max(300).optional(),
	avatarUrl: z
		.string()
		.max(500)
		.optional()
		.or(z.literal(""))
		.refine((value) => !value || isValidAvatarUrl(value), {
			message: "Must be an http(s) URL or /uploads path",
		})
		.transform((v) => v || undefined),
})
type FormData = z.infer<typeof schema>

function ProfilePage() {
	const trpc = useTRPC()
	const queryClient = useQueryClient()
	const { data: profile } = useQuery(trpc.profile.getCurrent.queryOptions())
	const updateProfile = useMutation(trpc.profile.update.mutationOptions())
	const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
	const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null)
	const fileInputRef = useRef<HTMLInputElement | null>(null)

	const {
		register,
		handleSubmit,
		reset,
		setValue,
		watch,
		formState: { errors, isSubmitting, isDirty },
	} = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			displayName: "",
			bio: "",
			avatarUrl: "",
		},
	})

	useEffect(() => {
		if (profile) {
			reset({
				displayName: profile.displayName ?? "",
				bio: profile.bio ?? "",
				avatarUrl: profile.avatarUrl ?? "",
			})
		}
	}, [profile, reset])

	const avatarUrl = watch("avatarUrl")
	const previewAvatarUrl = avatarUrl || profile?.avatarUrl || undefined

	const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.currentTarget.files?.[0]
		event.currentTarget.value = ""
		if (!file) return

		setAvatarUploadError(null)
		setIsUploadingAvatar(true)

		try {
			const formData = new FormData()
			formData.append("file", file)

			const response = await fetch("/api/upload/avatar", {
				method: "POST",
				body: formData,
			})

			const payload = (await response.json().catch(() => ({}))) as {
				url?: string
				error?: string
			}

			if (!response.ok || !payload.url) {
				throw new Error(payload.error ?? "Upload failed")
			}

			setValue("avatarUrl", payload.url, {
				shouldDirty: true,
				shouldTouch: true,
				shouldValidate: true,
			})
		} catch (error) {
			setAvatarUploadError(
				error instanceof Error ? error.message : "Upload failed",
			)
		} finally {
			setIsUploadingAvatar(false)
		}
	}

	const onSubmit = async (data: FormData) => {
		await updateProfile.mutateAsync({
			displayName: data.displayName,
			bio: data.bio,
			avatarUrl: data.avatarUrl ?? null,
		})
		await queryClient.invalidateQueries({
			queryKey: ["trpc", "profile", "getCurrent"],
		})
	}

	return (
		<div className="max-w-lg px-4 py-5 sm:px-6 md:p-8">
			<div className="mb-6">
				<h1
					className="text-2xl text-[#11110F]"
					style={{ fontFamily: "'Archivo Black', sans-serif" }}
				>
					Profile
				</h1>
				<p className="text-sm text-[#4B4B45] mt-1">
					Your public profile information
				</p>
			</div>

			{profile && (
				<div className="kinetic-panel p-6 mb-4">
					<div className="flex items-center gap-3 mb-2">
						<Avatar className="w-10 h-10">
							<AvatarImage
								src={previewAvatarUrl}
								alt={`${profile.displayName ?? profile.username} avatar`}
								decoding="async"
							/>
							<AvatarFallback className="bg-[#F5FF7B] text-[#11110F] font-medium">
								{profile.displayName?.charAt(0).toUpperCase() ?? "?"}
							</AvatarFallback>
						</Avatar>
						<div>
							<p className="text-sm font-medium text-[#11110F]">
								@{profile.username}
							</p>
							<p className="text-xs text-[#4B4B45]">
								{`llink.space/u/${profile.username}`}
							</p>
						</div>
					</div>
				</div>
			)}

			<div className="kinetic-panel p-6">
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					{updateProfile.isSuccess && (
						<p className="text-sm text-[#0B7A42] bg-[#DBF9E6] border-2 border-black rounded-xl px-3 py-2">
							Profile updated!
						</p>
					)}

					<div className="space-y-1.5">
						<Label htmlFor="displayName">Display name</Label>
						<Input
							id="displayName"
							placeholder="Your name"
							{...register("displayName")}
						/>
						{errors.displayName && (
							<p className="text-xs text-[#B42318]">{errors.displayName.message}</p>
						)}
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="bio">Bio</Label>
						<Textarea
							id="bio"
							placeholder="A short bio about yourself"
							className="resize-none"
							rows={3}
							{...register("bio")}
						/>
						{errors.bio && (
							<p className="text-xs text-[#B42318]">{errors.bio.message}</p>
						)}
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="avatarUpload">Avatar</Label>
						<input
							ref={fileInputRef}
							id="avatarUpload"
							type="file"
							accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
							onChange={handleAvatarUpload}
							className="hidden"
						/>
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => fileInputRef.current?.click()}
								disabled={isUploadingAvatar}
							>
								{isUploadingAvatar ? "Uploading…" : "Upload image"}
							</Button>
							{avatarUrl && (
								<Button
									type="button"
									variant="outline"
									onClick={() =>
										setValue("avatarUrl", "", {
											shouldDirty: true,
											shouldTouch: true,
											shouldValidate: true,
										})
									}
								>
									Remove image
								</Button>
							)}
						</div>
						{avatarUploadError && (
							<p className="text-xs text-[#B42318]">{avatarUploadError}</p>
						)}
						<p className="text-xs text-[#6A675C]">
							Upload an image and we handle the storage URL automatically. In
							local dev, files are stored in `public/uploads`.
						</p>
						<input type="hidden" {...register("avatarUrl")} />
						{errors.avatarUrl && (
							<p className="text-xs text-[#B42318]">{errors.avatarUrl.message}</p>
						)}
					</div>

						<Button
							type="submit"
							disabled={isSubmitting || !isDirty}
							className="w-full sm:w-auto"
						>
							{isSubmitting ? "Saving…" : "Save changes"}
						</Button>
				</form>
			</div>
		</div>
	)
}
