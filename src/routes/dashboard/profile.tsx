import { createFileRoute, redirect } from "@tanstack/react-router";
import { useTRPC } from "#/integrations/trpc/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { checkDashboardAccess } from "#/lib/auth-server";
import { isAllowedAvatarUrl } from "#/lib/security";
import { authClient } from "#/lib/auth-client";

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

const schema = z.object({
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
		.transform((v) => v || undefined),
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
	const displayNameId = useId();
	const bioId = useId();
	const avatarUploadId = useId();
	const currentPasswordId = useId();
	const newPasswordId = useId();
	const confirmNewPasswordId = useId();
	const fileInputRef = useRef<HTMLInputElement | null>(null);
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
			});
		}
	}, [profile, reset]);

	const avatarUrl = watch("avatarUrl");
	const previewAvatarUrl = avatarUrl || profile?.avatarUrl || undefined;

	const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = "";
		if (!file) return;

		setAvatarUploadError(null);
		setIsUploadingAvatar(true);

		try {
			const formData = new FormData();
			formData.append("file", file);

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

	const onSubmit = async (data: FormData) => {
		await updateProfile.mutateAsync({
			displayName: data.displayName,
			bio: data.bio,
			avatarUrl: data.avatarUrl ?? null,
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

			<div className="kinetic-panel p-6 mb-4">
				<div className="flex items-center gap-3 mb-2">
					<Avatar className="w-10 h-10">
						<AvatarImage
							src={previewAvatarUrl}
							alt={`${profile.displayName ?? profile.username} avatar`}
							decoding="async"
						/>
						<AvatarFallback className="bg-[#F5FF7B] text-[#11110F] font-medium">
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
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					{updateProfile.isSuccess && (
						<p className="text-sm text-[#0B7A42] bg-[#DBF9E6] border-2 border-black rounded-xl px-3 py-2">
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
							ref={fileInputRef}
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
							<p className="text-xs text-[#B42318]">
								{errors.avatarUrl.message}
							</p>
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
