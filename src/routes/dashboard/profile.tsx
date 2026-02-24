import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { type ChangeEvent, useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { useTRPC } from "#/integrations/trpc/react";
import { authClient } from "#/lib/auth-client";
import { checkDashboardAccess } from "#/lib/auth-server";
import {
	DEFAULT_PROFILE_BACKGROUND_COLOR_ID,
	DEFAULT_PROFILE_BACKGROUND_GRADIENT_ID,
	DEFAULT_PROFILE_BACKGROUND_TYPE,
	getProfileBackgroundColorValue,
	getProfileBackgroundGradientValue,
	isProfileBackgroundColorId,
	isProfileBackgroundGradientId,
	PROFILE_BACKGROUND_COLOR_OPTIONS,
	PROFILE_BACKGROUND_GRADIENT_OPTIONS,
	PROFILE_BACKGROUND_TYPES,
	type ProfileBackgroundType,
} from "#/lib/profile-backgrounds";
import {
	isAllowedAvatarUrl,
	isAllowedBackgroundImageUrl,
} from "#/lib/security";

const BACKGROUND_TYPE_LABELS: Record<ProfileBackgroundType, string> = {
	color: "Color",
	gradient: "Gradient",
	image: "Custom image",
};

function toCssBackgroundImageUrl(value: string) {
	const safeValue = value.replace(/["\\\n\r\f]/g, "");
	return `url("${safeValue}")`;
}

function getBackgroundPreviewStyle(input: {
	type: ProfileBackgroundType;
	colorId: string;
	gradientId: string;
	imageUrl?: string;
}) {
	if (input.type === "color") {
		return {
			background: getProfileBackgroundColorValue(input.colorId),
		};
	}

	if (input.type === "image" && input.imageUrl) {
		return {
			backgroundColor: "#11110F",
			backgroundImage: `linear-gradient(130deg, rgba(17,17,15,0.45), rgba(17,17,15,0.2)), ${toCssBackgroundImageUrl(input.imageUrl)}`,
			backgroundPosition: "center",
			backgroundSize: "cover",
		};
	}

	return {
		background: getProfileBackgroundGradientValue(input.gradientId),
	};
}

export const Route = createFileRoute("/dashboard/profile")({
	loader: async () => {
		const result = await checkDashboardAccess();
		if (result.status === "unauthenticated") {
			throw redirect({ to: "/sign-in" });
		}
		if (result.status === "no-profile") {
			throw redirect({ to: "/onboarding" });
		}
		return { profile: result.profile };
	},
	component: ProfilePage,
});

const schema = z
	.object({
		displayName: z.string().min(1, "Name is required").max(100),
		bio: z.string().max(300).optional(),
		avatarUrl: z
			.string()
			.max(500)
			.optional()
			.or(z.literal(""))
			.refine((value) => !value || isAllowedAvatarUrl(value), {
				message:
					"Must be an http(s) URL, /uploads path, or /api/storage path (SVG not allowed)",
			})
			.transform((value) => value || undefined),
		pageBackgroundType: z.enum(PROFILE_BACKGROUND_TYPES),
		pageBackgroundColor: z
			.string()
			.max(40)
			.refine((value) => isProfileBackgroundColorId(value), {
				message: "Select a valid color option",
			}),
		pageBackgroundGradient: z
			.string()
			.max(40)
			.refine((value) => isProfileBackgroundGradientId(value), {
				message: "Select a valid gradient option",
			}),
		pageBackgroundImageUrl: z
			.string()
			.max(500)
			.optional()
			.or(z.literal(""))
			.refine((value) => !value || isAllowedBackgroundImageUrl(value), {
				message:
					"Must be an http(s) URL, /uploads path, or /api/storage path (SVG not allowed)",
			})
			.transform((value) => value || undefined),
	})
	.superRefine((value, ctx) => {
		if (value.pageBackgroundType === "image" && !value.pageBackgroundImageUrl) {
			ctx.addIssue({
				code: "custom",
				message: "Upload an image to use custom background mode",
				path: ["pageBackgroundImageUrl"],
			});
		}
	});

type FormInput = z.input<typeof schema>;
type FormData = z.output<typeof schema>;

const passwordSchema = z
	.object({
		currentPassword: z
			.string()
			.min(8, "Current password must be at least 8 characters"),
		newPassword: z
			.string()
			.min(8, "New password must be at least 8 characters"),
		confirmNewPassword: z.string().min(8, "Please confirm your new password"),
	})
	.refine((value) => value.newPassword === value.confirmNewPassword, {
		path: ["confirmNewPassword"],
		message: "New passwords do not match",
	});

type PasswordFormData = z.infer<typeof passwordSchema>;

function ProfilePage() {
	const { profile: initialProfile } = Route.useLoaderData();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const profileQueryOptions = trpc.profile.getCurrent.queryOptions();
	const { data: profile = initialProfile } = useQuery({
		...profileQueryOptions,
		initialData: initialProfile,
	});
	const updateProfile = useMutation(trpc.profile.update.mutationOptions());
	const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
	const [avatarUploadError, setAvatarUploadError] = useState<string | null>(
		null,
	);
	const [isUploadingBackground, setIsUploadingBackground] = useState(false);
	const [backgroundUploadError, setBackgroundUploadError] = useState<
		string | null
	>(null);
	const displayNameId = useId();
	const bioId = useId();
	const avatarUploadId = useId();
	const backgroundUploadId = useId();
	const currentPasswordId = useId();
	const newPasswordId = useId();
	const confirmNewPasswordId = useId();
	const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
	const backgroundFileInputRef = useRef<HTMLInputElement | null>(null);
	const [passwordUpdateError, setPasswordUpdateError] = useState<string | null>(
		null,
	);
	const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState<
		string | null
	>(null);

	const {
		register,
		handleSubmit,
		reset,
		setValue,
		watch,
		formState: { errors, isSubmitting, isDirty },
	} = useForm<FormInput, unknown, FormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			displayName: initialProfile.displayName ?? "",
			bio: initialProfile.bio ?? "",
			avatarUrl: initialProfile.avatarUrl ?? "",
			pageBackgroundType:
				initialProfile.pageBackgroundType ?? DEFAULT_PROFILE_BACKGROUND_TYPE,
			pageBackgroundColor:
				initialProfile.pageBackgroundColor ??
				DEFAULT_PROFILE_BACKGROUND_COLOR_ID,
			pageBackgroundGradient:
				initialProfile.pageBackgroundGradient ??
				DEFAULT_PROFILE_BACKGROUND_GRADIENT_ID,
			pageBackgroundImageUrl: initialProfile.pageBackgroundImageUrl ?? "",
		},
	});

	const {
		register: registerPassword,
		handleSubmit: handlePasswordSubmit,
		reset: resetPasswordForm,
		formState: {
			errors: passwordFormErrors,
			isSubmitting: isUpdatingPassword,
			isDirty: isPasswordFormDirty,
		},
	} = useForm<PasswordFormData>({
		resolver: zodResolver(passwordSchema),
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmNewPassword: "",
		},
	});

	useEffect(() => {
		if (profile) {
			reset({
				displayName: profile.displayName ?? "",
				bio: profile.bio ?? "",
				avatarUrl: profile.avatarUrl ?? "",
				pageBackgroundType:
					profile.pageBackgroundType ?? DEFAULT_PROFILE_BACKGROUND_TYPE,
				pageBackgroundColor:
					profile.pageBackgroundColor ?? DEFAULT_PROFILE_BACKGROUND_COLOR_ID,
				pageBackgroundGradient:
					profile.pageBackgroundGradient ??
					DEFAULT_PROFILE_BACKGROUND_GRADIENT_ID,
				pageBackgroundImageUrl: profile.pageBackgroundImageUrl ?? "",
			});
		}
	}, [profile, reset]);

	const avatarUrl = watch("avatarUrl");
	const pageBackgroundType = watch("pageBackgroundType");
	const pageBackgroundColor = watch("pageBackgroundColor");
	const pageBackgroundGradient = watch("pageBackgroundGradient");
	const pageBackgroundImageUrl = watch("pageBackgroundImageUrl");
	const previewAvatarUrl = avatarUrl || profile?.avatarUrl || undefined;
	const previewBackgroundImageUrl =
		pageBackgroundImageUrl || profile?.pageBackgroundImageUrl || undefined;
	const previewBackgroundStyle = getBackgroundPreviewStyle({
		type: pageBackgroundType,
		colorId: pageBackgroundColor,
		gradientId: pageBackgroundGradient,
		imageUrl: previewBackgroundImageUrl,
	});

	const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = "";
		if (!file) return;

		setAvatarUploadError(null);
		setIsUploadingAvatar(true);

		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("purpose", "avatar");

			const response = await fetch("/api/upload/avatar", {
				method: "POST",
				body: formData,
			});

			const payload = (await response.json().catch(() => ({}))) as {
				url?: string;
				error?: string;
			};

			if (!response.ok || !payload.url) {
				throw new Error(payload.error ?? "Upload failed");
			}

			setValue("avatarUrl", payload.url, {
				shouldDirty: true,
				shouldTouch: true,
				shouldValidate: true,
			});
		} catch (error) {
			setAvatarUploadError(
				error instanceof Error ? error.message : "Upload failed",
			);
		} finally {
			setIsUploadingAvatar(false);
		}
	};

	const handleBackgroundUpload = async (
		event: ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = "";
		if (!file) return;

		setBackgroundUploadError(null);
		setIsUploadingBackground(true);

		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("purpose", "background");

			const response = await fetch("/api/upload/avatar", {
				method: "POST",
				body: formData,
			});

			const payload = (await response.json().catch(() => ({}))) as {
				url?: string;
				error?: string;
			};

			if (!response.ok || !payload.url) {
				throw new Error(payload.error ?? "Upload failed");
			}

			setValue("pageBackgroundImageUrl", payload.url, {
				shouldDirty: true,
				shouldTouch: true,
				shouldValidate: true,
			});
			setValue("pageBackgroundType", "image", {
				shouldDirty: true,
				shouldTouch: true,
				shouldValidate: true,
			});
		} catch (error) {
			setBackgroundUploadError(
				error instanceof Error ? error.message : "Upload failed",
			);
		} finally {
			setIsUploadingBackground(false);
		}
	};

	const onSubmit = async (data: FormData) => {
		setBackgroundUploadError(null);
		await updateProfile.mutateAsync({
			displayName: data.displayName,
			bio: data.bio,
			avatarUrl: data.avatarUrl ?? null,
			pageBackgroundType: data.pageBackgroundType,
			pageBackgroundColor: data.pageBackgroundColor,
			pageBackgroundGradient: data.pageBackgroundGradient,
			pageBackgroundImageUrl:
				data.pageBackgroundType === "image"
					? (data.pageBackgroundImageUrl ?? null)
					: null,
		});
		await queryClient.invalidateQueries({
			queryKey: ["trpc", "profile", "getCurrent"],
		});
	};

	const onPasswordSubmit = async (data: PasswordFormData) => {
		setPasswordUpdateError(null);
		setPasswordUpdateSuccess(null);

		const result = await authClient.changePassword({
			currentPassword: data.currentPassword,
			newPassword: data.newPassword,
			revokeOtherSessions: false,
		});

		if (result.error) {
			setPasswordUpdateError(
				result.error.message ?? "Failed to update password",
			);
			return;
		}

		resetPasswordForm();
		setPasswordUpdateSuccess("Password updated successfully.");
	};

	return (
		<div className="max-w-2xl px-4 py-5 sm:px-6 md:p-8">
			<div className="mb-6">
				<h1
					className="text-2xl text-[#11110F]"
					style={{ fontFamily: "'Archivo Black', sans-serif" }}
				>
					Profile
				</h1>
				<p className="mt-1 text-sm text-[#4B4B45]">
					Your public profile information
				</p>
			</div>

			<div className="kinetic-panel mb-4 p-6">
				<div className="mb-2 flex items-center gap-3">
					<Avatar className="h-10 w-10">
						<AvatarImage
							src={previewAvatarUrl}
							alt={`${profile.displayName ?? profile.username} avatar`}
							decoding="async"
						/>
						<AvatarFallback className="bg-[#F5FF7B] font-medium text-[#11110F]">
							{(
								profile.displayName?.charAt(0) ??
								profile.username.charAt(0) ??
								"?"
							).toUpperCase()}
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

			<div className="kinetic-panel p-6">
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
					{updateProfile.isSuccess && (
						<p className="rounded-xl border-2 border-black bg-[#DBF9E6] px-3 py-2 text-sm text-[#0B7A42]">
							Profile updated!
						</p>
					)}

					<div className="space-y-1.5">
						<Label htmlFor={displayNameId}>Display name</Label>
						<Input
							id={displayNameId}
							placeholder="Your name"
							{...register("displayName")}
						/>
						{errors.displayName && (
							<p className="text-xs text-[#B42318]">
								{errors.displayName.message}
							</p>
						)}
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={bioId}>Bio</Label>
						<Textarea
							id={bioId}
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
						<Label htmlFor={avatarUploadId}>Avatar</Label>
						<input
							ref={avatarFileInputRef}
							id={avatarUploadId}
							type="file"
							accept="image/jpeg,image/png,image/webp,image/gif"
							onChange={handleAvatarUpload}
							className="hidden"
						/>
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => avatarFileInputRef.current?.click()}
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
							<p className="text-xs text-[#B42318]">
								{errors.avatarUrl.message}
							</p>
						)}
					</div>

					<div className="space-y-3 rounded-xl border-2 border-black/80 bg-[#FFFCED] p-4">
						<div>
							<p className="text-sm font-semibold text-[#11110F]">
								Page background
							</p>
							<p className="mt-1 text-xs text-[#6A675C]">
								Choose a solid color, gradient, or upload your own image.
							</p>
						</div>

						<div className="grid gap-2 sm:grid-cols-3">
							{PROFILE_BACKGROUND_TYPES.map((type) => {
								const isSelected = pageBackgroundType === type;
								return (
									<button
										key={type}
										type="button"
										onClick={() =>
											setValue("pageBackgroundType", type, {
												shouldDirty: true,
												shouldTouch: true,
												shouldValidate: true,
											})
										}
										className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition ${
											isSelected
												? "border-black bg-[#F5FF7B] text-[#11110F]"
												: "border-black/40 bg-white text-[#11110F]"
										}`}
									>
										{BACKGROUND_TYPE_LABELS[type]}
									</button>
								);
							})}
						</div>

						{pageBackgroundType === "color" && (
							<div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
								{PROFILE_BACKGROUND_COLOR_OPTIONS.map((option) => {
									const isSelected = pageBackgroundColor === option.id;
									return (
										<button
											key={option.id}
											type="button"
											onClick={() =>
												setValue("pageBackgroundColor", option.id, {
													shouldDirty: true,
													shouldTouch: true,
													shouldValidate: true,
												})
											}
											className={`h-10 rounded-lg border-2 transition ${
												isSelected
													? "border-black shadow-[2px_2px_0_0_#11110F]"
													: "border-black/35"
											}`}
											style={{ background: option.value }}
											title={option.label}
										/>
									);
								})}
							</div>
						)}

						{pageBackgroundType === "gradient" && (
							<div className="grid gap-2 sm:grid-cols-2">
								{PROFILE_BACKGROUND_GRADIENT_OPTIONS.map((option) => {
									const isSelected = pageBackgroundGradient === option.id;
									return (
										<button
											key={option.id}
											type="button"
											onClick={() =>
												setValue("pageBackgroundGradient", option.id, {
													shouldDirty: true,
													shouldTouch: true,
													shouldValidate: true,
												})
											}
											className={`h-14 rounded-xl border-2 px-3 text-left text-xs font-semibold text-[#11110F] ${
												isSelected
													? "border-black shadow-[2px_2px_0_0_#11110F]"
													: "border-black/35"
											}`}
											style={{ background: option.value }}
										>
											<span className="rounded bg-white/85 px-2 py-1">
												{option.label}
											</span>
										</button>
									);
								})}
							</div>
						)}

						{pageBackgroundType === "image" && (
							<div className="space-y-2">
								<input
									ref={backgroundFileInputRef}
									id={backgroundUploadId}
									type="file"
									accept="image/jpeg,image/png,image/webp,image/gif"
									onChange={handleBackgroundUpload}
									className="hidden"
								/>
								<div className="flex flex-wrap gap-2">
									<Button
										type="button"
										variant="outline"
										onClick={() => backgroundFileInputRef.current?.click()}
										disabled={isUploadingBackground}
									>
										{isUploadingBackground ? "Uploading…" : "Upload background"}
									</Button>
									{previewBackgroundImageUrl && (
										<Button
											type="button"
											variant="outline"
											onClick={() =>
												setValue("pageBackgroundImageUrl", "", {
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
								<p className="text-xs text-[#6A675C]">
									Custom background images use the same storage pipeline as
									avatars.
								</p>
							</div>
						)}

						<div
							className="relative h-32 overflow-hidden rounded-xl border-2 border-black"
							style={previewBackgroundStyle}
						>
							<div className="absolute left-2 top-2 rounded-md bg-white/85 px-2 py-1 text-[11px] font-semibold text-[#11110F]">
								Live preview
							</div>
						</div>

						{backgroundUploadError && (
							<p className="text-xs text-[#B42318]">{backgroundUploadError}</p>
						)}
						{errors.pageBackgroundImageUrl && (
							<p className="text-xs text-[#B42318]">
								{errors.pageBackgroundImageUrl.message}
							</p>
						)}
						<input type="hidden" {...register("pageBackgroundType")} />
						<input type="hidden" {...register("pageBackgroundColor")} />
						<input type="hidden" {...register("pageBackgroundGradient")} />
						<input type="hidden" {...register("pageBackgroundImageUrl")} />
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

			<div className="kinetic-panel mt-4 p-6">
				<h2 className="text-base font-semibold text-[#11110F]">Security</h2>
				<p className="mt-1 text-xs text-[#6A675C]">
					Update your password to keep your account secure.
				</p>

				<form
					onSubmit={handlePasswordSubmit(onPasswordSubmit)}
					className="mt-4 space-y-4"
				>
					{passwordUpdateError && (
						<p className="rounded-xl border-2 border-black bg-[#FFD9CF] px-3 py-2 text-sm text-[#7E1612]">
							{passwordUpdateError}
						</p>
					)}
					{passwordUpdateSuccess && (
						<p className="rounded-xl border-2 border-black bg-[#DBF9E6] px-3 py-2 text-sm text-[#0B7A42]">
							{passwordUpdateSuccess}
						</p>
					)}

					<div className="space-y-1.5">
						<Label htmlFor={currentPasswordId}>Current password</Label>
						<Input
							id={currentPasswordId}
							type="password"
							placeholder="Current password"
							autoComplete="current-password"
							{...registerPassword("currentPassword")}
						/>
						{passwordFormErrors.currentPassword && (
							<p className="text-xs text-[#B42318]">
								{passwordFormErrors.currentPassword.message}
							</p>
						)}
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={newPasswordId}>New password</Label>
						<Input
							id={newPasswordId}
							type="password"
							placeholder="New password"
							autoComplete="new-password"
							{...registerPassword("newPassword")}
						/>
						{passwordFormErrors.newPassword && (
							<p className="text-xs text-[#B42318]">
								{passwordFormErrors.newPassword.message}
							</p>
						)}
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={confirmNewPasswordId}>Confirm new password</Label>
						<Input
							id={confirmNewPasswordId}
							type="password"
							placeholder="Confirm new password"
							autoComplete="new-password"
							{...registerPassword("confirmNewPassword")}
						/>
						{passwordFormErrors.confirmNewPassword && (
							<p className="text-xs text-[#B42318]">
								{passwordFormErrors.confirmNewPassword.message}
							</p>
						)}
					</div>

					<Button
						type="submit"
						disabled={isUpdatingPassword || !isPasswordFormDirty}
						className="w-full sm:w-auto"
					>
						{isUpdatingPassword ? "Updating…" : "Update password"}
					</Button>
				</form>
			</div>
		</div>
	);
}
