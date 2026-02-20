import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTRPC } from "#/integrations/trpc/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { useId, useState, type ChangeEvent } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { useDebounce } from "#/lib/use-debounce";
import { SiteBrand } from "#/components/SiteBrand";

export const Route = createFileRoute("/onboarding/")({
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

	const { data: checkData } = useQuery(
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

	const isAvailable = debouncedUsername.length >= 2 && checkData?.available;
	const isTaken =
		debouncedUsername.length >= 2 && checkData?.available === false;

	return (
		<div className="kinetic-gradient min-h-screen flex items-center justify-center px-4">
			<div className="my-6 w-full max-w-sm kinetic-shell p-6 sm:p-7">
				<div className="text-center mb-8">
					<a href="/" className="inline-block mb-6">
						<SiteBrand size="lg" />
					</a>
					<h1 className="text-2xl font-semibold text-[#11110F]">
						Claim your username
					</h1>
					<p className="text-[#4B4B45] mt-2 text-sm">
						This will be your public profile URL
					</p>
				</div>

				<div className="kinetic-panel p-6">
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
						{createProfile.error && (
							<p className="text-sm text-[#7E1612] bg-[#FFD9CF] border-2 border-black rounded-xl px-3 py-2">
								{createProfile.error.message}
							</p>
						)}

						<div className="space-y-1.5">
							<Label htmlFor={usernameId}>Username</Label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 hidden -translate-y-1/2 text-[#4B4B45] text-sm sm:block">
									llink.space/u/
								</span>
								<span className="mb-1 block text-xs text-[#6A675C] sm:hidden">
									llink.space/u/
								</span>
								<Input
									id={usernameId}
									className="sm:pl-[108px]"
									placeholder="yourname"
									{...register("username", {
										onChange: (e: ChangeEvent<HTMLInputElement>) =>
											setUsernameInput(e.target.value.toLowerCase()),
									})}
								/>
								{isAvailable && (
									<CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
								)}
								{isTaken && (
									<XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B42318]" />
								)}
							</div>
							{errors.username && (
								<p className="text-xs text-[#B42318]">
									{errors.username.message}
								</p>
							)}
							{isTaken && (
								<p className="text-xs text-[#B42318]">Username already taken</p>
							)}
							{isAvailable && (
								<p className="text-xs text-[#0B7A42]">Username available!</p>
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
								<p className="text-xs text-[#B42318]">
									{errors.displayName.message}
								</p>
							)}
						</div>

						<Button
							type="submit"
							className="w-full"
							disabled={isSubmitting || isTaken}
						>
							{isSubmitting ? "Creating profile…" : "Continue →"}
						</Button>
					</form>
				</div>
			</div>
		</div>
	);
}
