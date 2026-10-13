import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { authClient } from "#/lib/auth-client";
import { toAbsoluteUrl } from "#/lib/site-url";

export const Route = createFileRoute("/_auth/sign-up")({
	head: () => {
		const title = "Sign up | llink.space";
		const description =
			"Create your llink.space account and launch your link-in-bio page.";
		const pageUrl = toAbsoluteUrl("/sign-up");

		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ name: "robots", content: "noindex, nofollow, noarchive" },
			],
			links: [{ rel: "canonical", href: pageUrl }],
		};
	},
	component: SignUpPage,
});

const schema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.string().email(),
	password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormData = z.infer<typeof schema>;

function SignUpPage() {
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const [isHydrated, setIsHydrated] = useState(false);
	const nameId = useId();
	const emailId = useId();
	const passwordId = useId();
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<FormData>({ resolver: zodResolver(schema) });

	useEffect(() => {
		setIsHydrated(true);
	}, []);

	const onSubmit = async (data: FormData) => {
		setError(null);
		try {
			const result = await authClient.signUp.email({
				name: data.name,
				email: data.email,
				password: data.password,
			});
			if (result.error) {
				setError(result.error.message ?? "Sign up failed");
				return;
			}
			await navigate({ to: "/onboarding" });
		} catch {
			setError("We could not reach the server. Please try again.");
		}
	};

	return (
		<Card className="gap-8 border-0 bg-transparent py-0 shadow-none">
			<CardHeader className="gap-2 px-0">
				<p className="eyebrow">Create account</p>
				<CardTitle className="font-display text-[2.5rem] leading-[1.02] font-semibold tracking-[-0.035em]">
					Start your page
				</CardTitle>
				<CardDescription className="text-[15px] text-muted-foreground">
					Get your link in bio in seconds
				</CardDescription>
			</CardHeader>
			<CardContent className="px-0">
				<form
					onSubmit={handleSubmit(onSubmit)}
					className="space-y-4"
					aria-busy={!isHydrated || isSubmitting}
				>
					{error && (
						<p
							role="alert"
							className="rounded-xl border border-destructive/20 bg-destructive/8 px-3.5 py-2.5 text-sm text-destructive"
						>
							{error}
						</p>
					)}
					<div className="space-y-1.5">
						<Label htmlFor={nameId}>Name</Label>
						<Input
							id={nameId}
							type="text"
							placeholder="Your name"
							autoComplete="name"
							aria-invalid={Boolean(errors.name)}
							{...register("name")}
						/>
						{errors.name && (
							<p className="text-xs text-destructive">{errors.name.message}</p>
						)}
					</div>
					<div className="space-y-1.5">
						<Label htmlFor={emailId}>Email</Label>
						<Input
							id={emailId}
							type="email"
							placeholder="you@example.com"
							autoComplete="email"
							aria-invalid={Boolean(errors.email)}
							{...register("email")}
						/>
						{errors.email && (
							<p className="text-xs text-destructive">{errors.email.message}</p>
						)}
					</div>
					<div className="space-y-1.5">
						<Label htmlFor={passwordId}>Password</Label>
						<Input
							id={passwordId}
							type="password"
							placeholder="Min. 8 characters"
							autoComplete="new-password"
							aria-invalid={Boolean(errors.password)}
							{...register("password")}
						/>
						{errors.password && (
							<p className="text-xs text-destructive">
								{errors.password.message}
							</p>
						)}
					</div>
					<Button
						type="submit"
						size="lg"
						variant="brand"
						className="w-full"
						disabled={!isHydrated || isSubmitting}
					>
						{!isHydrated
							? "Loading…"
							: isSubmitting
								? "Creating account…"
								: "Create account"}
					</Button>
				</form>
				<p className="mt-6 text-sm text-muted-foreground">
					Already have an account?{" "}
					<Link
						to="/sign-in"
						className="font-semibold text-foreground underline decoration-signal decoration-2 underline-offset-4"
					>
						Sign in
					</Link>
				</p>
			</CardContent>
		</Card>
	);
}
