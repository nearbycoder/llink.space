import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { authClient } from "#/lib/auth-client"
import { Button } from "#/components/ui/button"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card"
import { useState } from "react"

export const Route = createFileRoute("/_auth/sign-in")({
	component: SignInPage,
})

const schema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
})
type FormData = z.infer<typeof schema>

function SignInPage() {
	const navigate = useNavigate()
	const [error, setError] = useState<string | null>(null)
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<FormData>({ resolver: zodResolver(schema) })

	const onSubmit = async (data: FormData) => {
		setError(null)
		const result = await authClient.signIn.email({
			email: data.email,
			password: data.password,
		})
		if (result.error) {
			setError(result.error.message ?? "Sign in failed")
			return
		}
		// Check if profile exists, go to dashboard or onboarding
		navigate({ to: "/dashboard" })
	}

	return (
		<Card className="border-2 border-black bg-[#FFFCEF] shadow-[6px_6px_0_0_#11110F]">
			<CardHeader className="space-y-1">
				<CardTitle className="text-xl font-semibold">Welcome back</CardTitle>
				<CardDescription className="text-[#4B4B45]">
					Sign in to manage your links
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					{error && (
						<p className="text-sm text-[#7E1612] bg-[#FFD9CF] border-2 border-black rounded-xl px-3 py-2">
							{error}
						</p>
					)}
					<div className="space-y-1.5">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							placeholder="you@example.com"
							{...register("email")}
						/>
						{errors.email && (
							<p className="text-xs text-[#B42318]">{errors.email.message}</p>
						)}
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="password">Password</Label>
						<Input
							id="password"
							type="password"
							placeholder="••••••••"
							{...register("password")}
						/>
						{errors.password && (
							<p className="text-xs text-[#B42318]">{errors.password.message}</p>
						)}
					</div>
					<Button type="submit" className="w-full" disabled={isSubmitting}>
						{isSubmitting ? "Signing in…" : "Sign in"}
					</Button>
				</form>
				<p className="text-sm text-center text-[#4B4B45] mt-4">
					Don't have an account?{" "}
					<Link
						to="/sign-up"
						className="text-[#11110F] font-medium underline-offset-2 hover:underline"
					>
						Sign up
					</Link>
				</p>
			</CardContent>
		</Card>
	)
}
