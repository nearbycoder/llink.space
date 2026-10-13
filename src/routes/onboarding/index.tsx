import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle, XCircle } from "lucide-react";
import { type ChangeEvent, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthFrame } from "#/components/AuthFrame";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { useTRPC } from "#/integrations/trpc/react";
import { toAbsoluteUrl } from "#/lib/site-url";
import { useDebounce } from "#/lib/use-debounce";

export const Route = createFileRoute("/onboarding/")({
	head: () => {
		const title = "Onboarding | llink.space";
		const description =
			"Choose your username and finish setting up your llink.space profile.";
		const pageUrl = toAbsoluteUrl("/onboarding");

		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ name: "robots", content: "noindex, nofollow, noarchive" },
			],
			links: [{ rel: "canonical", href: pageUrl }],
		};
	},
	component: OnboardingPage,
});

const schema = z.object({
	username: z
		.string()
		.min(2, "At least 2 characters")
		.max(30, "Max 30 characters")
		.regex(/^[a-z0-9_-]+$/, "Only lowercase letters, numbers, - and _"),
	displayName: z.string().min(1, "Name is required").max(100),
});
type FormData = z.infer<typeof schema>;

function OnboardingPage() {
	const navigate = useNavigate();
	const trpc = useTRPC();
	const [usernameInput, setUsernameInput] = useState("");
	const usernameId = useId();
	const displayNameId = useId();
	const debouncedUsername = useDebounce(usernameInput, 400);

	const usernameCheck = useQuery(
		trpc.profile.checkUsername.queryOptions(
			{ username: debouncedUsername },
			{ enabled: debouncedUsername.length >= 2 },
		),
	);

	const createProfile = useMutation(trpc.profile.create.mutationOptions());

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<FormData>({ resolver: zodResolver(schema) });

	const onSubmit = async (data: FormData) => {
		await createProfile.mutateAsync({
			username: data.username,
			displayName: data.displayName,
		});
		navigate({ to: "/dashboard" });
	};

	const isCurrentCheck =
		usernameInput.length >= 2 && usernameInput === debouncedUsername;
	const isCheckingUsername =
		usernameInput.length >= 2 && (!isCurrentCheck || usernameCheck.isFetching);
	const isAvailable = isCurrentCheck && usernameCheck.data?.available === true;
	const isTaken = isCurrentCheck && usernameCheck.data?.available === false;

	return (
		<AuthFrame>
			<div className="mb-8">
				<p className="eyebrow">Step 2 of 2</p>
				<h1 className="font-display mt-2 text-[2.5rem] leading-[1.02] font-semibold tracking-[-0.035em] text-foreground">
					Claim your username
				</h1>
				<p className="mt-2 text-[15px] text-muted-foreground">
					This will be your public profile URL
				</p>
			</div>

			<div>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					{createProfile.error && (
						<p className="rounded-xl border border-destructive/20 bg-destructive/8 px-3.5 py-2.5 text-sm text-destructive">
							{createProfile.error.message}
						</p>
					)}

					<div className="space-y-1.5">
						<Label htmlFor={usernameId}>Username</Label>
						<div className="relative">
							<span className="absolute left-3.5 top-1/2 hidden -translate-y-1/2 font-mono text-[13px] text-muted-foreground sm:block">
								llink.space/u/
							</span>
							<span className="mb-1 block font-mono text-xs text-muted-foreground sm:hidden">
								llink.space/u/
							</span>
							<Input
								id={usernameId}
								className="font-mono sm:pl-[122px]"
								placeholder="yourname"
								{...register("username", {
									onChange: (e: ChangeEvent<HTMLInputElement>) => {
										const normalized = e.target.value
											.toLowerCase()
											.replace(/\s+/g, "");
										e.target.value = normalized;
										setUsernameInput(normalized);
									},
								})}
							/>
							{isAvailable && (
								<CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success" />
							)}
							{isTaken && (
								<XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
							)}
						</div>
						{errors.username && (
							<p className="text-xs text-destructive">
								{errors.username.message}
							</p>
						)}
						{isTaken && (
							<p className="text-xs text-destructive">Username already taken</p>
						)}
						{isAvailable && (
							<p className="text-xs text-success">Username available!</p>
						)}
						{isCheckingUsername && (
							<p className="text-xs text-muted-foreground">
								Checking availability…
							</p>
						)}
						{usernameCheck.isError && isCurrentCheck && (
							<p className="text-xs text-destructive">
								Could not check this username. Try again.
							</p>
						)}
					</div>

					<div className="space-y-1.5">
						<Label htmlFor={displayNameId}>Display name</Label>
						<Input
							id={displayNameId}
							type="text"
							placeholder="Your full name"
							{...register("displayName")}
						/>
						{errors.displayName && (
							<p className="text-xs text-destructive">
								{errors.displayName.message}
							</p>
						)}
					</div>

					<Button
						type="submit"
						size="lg"
						variant="brand"
						className="w-full"
						disabled={isSubmitting || !isAvailable}
					>
						{isSubmitting ? "Creating profile…" : "Continue →"}
					</Button>
				</form>
			</div>
		</AuthFrame>
	);
}
