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

export const Route = createFileRoute("/_auth/sign-in")({
	head: () => {
		const title = "Sign in | llink.space";
		const description =
			"Sign in to manage your link-in-bio page on llink.space.";
		const pageUrl = toAbsoluteUrl("/sign-in");

		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ name: "robots", content: "noindex, nofollow, noarchive" },
			],
			links: [{ rel: "canonical", href: pageUrl }],
		};
	},
	component: SignInPage,
});

const schema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
});
type FormData = z.infer<typeof schema>;

function SignInPage() {
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const [isHydrated, setIsHydrated] = useState(false);
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
			const result = await authClient.signIn.email({
				email: data.email,
				password: data.password,
			});
			if (result.error) {
				setError(result.error.message ?? "Sign in failed");
				return;
			}
			await navigate({ to: "/dashboard" });
		} catch {
			setError("We could not reach the server. Please try again.");
		}
	};

	return (
		<Card className="gap-8 border-0 bg-transparent py-0 shadow-none">
			<CardHeader className="gap-2 px-0">
				<p className="eyebrow">Sign in</p>
				<CardTitle className="font-display text-[2.5rem] leading-[1.02] font-semibold tracking-[-0.035em]">
					Welcome back
				</CardTitle>
				<CardDescription className="text-[15px] text-muted-foreground">
					Sign in to manage your links
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
							placeholder="••••••••"
							autoComplete="current-password"
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
						className="w-full"
						disabled={!isHydrated || isSubmitting}
					>
						{!isHydrated
							? "Loading…"
							: isSubmitting
								? "Signing in…"
								: "Sign in"}
					</Button>
				</form>
				<p className="mt-6 text-sm text-muted-foreground">
					Don't have an account?{" "}
					<Link
						to="/sign-up"
						className="font-semibold text-foreground underline decoration-signal decoration-2 underline-offset-4"
					>
						Sign up
					</Link>
				</p>
			</CardContent>
		</Card>
	);
}
