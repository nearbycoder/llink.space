import { createFileRoute } from "@tanstack/react-router"
import { TRPCClientError } from "@trpc/client"
import { useTRPC } from "#/integrations/trpc/react"
import { useMutation } from "@tanstack/react-query"
import { ProfileHeader } from "#/components/profile/ProfileHeader"
import { LinkCard } from "#/components/profile/LinkCard"
import { getTheme } from "#/lib/themes"

export const Route = createFileRoute("/u/$username")({
	ssr: true,
	loader: async ({ params, context }) => {
		try {
			const data = await context.queryClient.ensureQueryData(
				context.trpc.links.getPublic.queryOptions({ username: params.username }),
			)
			return { data }
		} catch (error) {
			if (error instanceof TRPCClientError && error.data?.code === "NOT_FOUND") {
				return { data: null }
			}
			throw error
		}
	},
	component: ProfilePage,
})

function ProfilePage() {
	const { data } = Route.useLoaderData()
	const trpc = useTRPC()

	const recordClick = useMutation(trpc.analytics.recordClick.mutationOptions())

	if (!data) {
		return (
			<div className="kinetic-gradient min-h-screen flex items-center justify-center px-4">
				<div className="kinetic-shell p-6 sm:p-10 text-center">
					<h1
						className="text-6xl text-[#11110F]"
						style={{ fontFamily: "'Archivo Black', sans-serif" }}
					>
						404
					</h1>
					<p className="text-[#4B4B45] mt-2">Profile not found</p>
					<a
						href="/"
						className="text-[#11110F] font-semibold mt-4 inline-block hover:underline"
					>
						← Back to llink.space
					</a>
				</div>
			</div>
		)
	}

	const { profile, links } = data
	const theme = getTheme(profile.theme ?? "default")

	const handleLinkClick = (linkId: string) => {
		recordClick.mutate({
			linkId,
			profileId: profile.id,
			referrer: typeof window !== "undefined" ? document.referrer : undefined,
			userAgent:
				typeof window !== "undefined" ? navigator.userAgent : undefined,
		})
	}

	return (
		<div
			className="min-h-screen"
			style={{ background: theme.background, fontFamily: "'Work Sans', sans-serif" }}
		>
			<div className="max-w-sm mx-auto px-4 py-10 sm:py-16">
				<div className="kinetic-shell p-6 sm:p-7">
					<ProfileHeader
						profile={profile}
						textColor={theme.text}
						mutedTextColor={theme.mutedText}
					/>

					{links.length > 0 ? (
						<div className="space-y-3">
							{links.map((link) => (
								<LinkCard
									key={link.id}
									id={link.id}
									title={link.title}
									url={link.url}
									description={link.description}
									iconUrl={link.iconUrl}
									cardBg={theme.cardBg}
									cardBorder={theme.cardBorder}
									textColor={theme.text}
									mutedTextColor={theme.mutedText}
									onClickRecord={handleLinkClick}
								/>
							))}
						</div>
					) : (
						<p
							className="text-center text-sm"
							style={{ color: theme.mutedText }}
						>
							No links yet
						</p>
					)}

					<div className="mt-12 text-center">
						<a
							href="/"
							className="text-xs hover:underline"
							style={{ color: theme.mutedText }}
						>
							Powered by llink.space
						</a>
					</div>
				</div>
			</div>
		</div>
	)
}
