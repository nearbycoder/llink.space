import { createFileRoute } from "@tanstack/react-router";
import { TRPCClientError } from "@trpc/client";
import { useTRPC } from "#/integrations/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { ProfileHeader } from "#/components/profile/ProfileHeader";
import { LinkCard } from "#/components/profile/LinkCard";
import { getTheme } from "#/lib/themes";
import { Home, SearchX, UserPlus } from "lucide-react";
import { SiteBrand } from "#/components/SiteBrand";

export const Route = createFileRoute("/u/$username")({
	ssr: true,
	loader: async ({ params, context }) => {
		try {
			const data = await context.queryClient.fetchQuery(
				context.trpc.links.getPublic.queryOptions({
					username: params.username,
				}),
			);
			return { data };
		} catch (error) {
			if (
				error instanceof TRPCClientError &&
				error.data?.code === "NOT_FOUND"
			) {
				return { data: null };
			}
			throw error;
		}
	},
	component: ProfilePage,
});

function ProfilePage() {
	const { data } = Route.useLoaderData();
	const { username } = Route.useParams();
	const trpc = useTRPC();

	const recordClick = useMutation(trpc.analytics.recordClick.mutationOptions());

	if (!data) {
		return (
			<div className="kinetic-gradient min-h-screen px-4 py-10 sm:py-16">
				<div className="mx-auto max-w-3xl">
					<div className="kinetic-shell overflow-hidden p-6 sm:p-10">
						<div className="grid gap-6 sm:grid-cols-[1.2fr,0.8fr] sm:items-center">
							<div>
								<div className="mb-4 inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#FFF7A8] px-3 py-1.5 text-xs font-semibold text-[#11110F] shadow-[2px_2px_0_0_#11110F]">
									<SearchX className="h-3.5 w-3.5" />
									Missing profile
								</div>
								<h1
									className="text-4xl leading-tight text-[#11110F] sm:text-5xl"
									style={{ fontFamily: "'Archivo Black', sans-serif" }}
								>
									That page is not here
								</h1>
								<p className="mt-3 text-base text-[#4B4B45] sm:text-lg">
									We could not find{" "}
									<span className="rounded-md border border-black/20 bg-white/80 px-2 py-0.5 font-semibold text-[#11110F]">
										/u/{username}
									</span>
									. It may be misspelled, removed, or not claimed yet.
								</p>
							</div>

							<div className="kinetic-panel bg-[#FFFCED] p-5">
								<div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-black bg-[#F5FF7B] text-2xl font-black text-[#11110F] shadow-[3px_3px_0_0_#11110F]">
									404
								</div>
								<p className="text-center text-sm font-semibold text-[#11110F]">
									No public profile found
								</p>
							</div>
						</div>

						<div className="mt-6 grid gap-3 sm:grid-cols-2">
							<a
								href="/"
								className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-black bg-[#11110F] px-4 py-3 text-sm font-semibold text-[#F5FF7B] shadow-[3px_3px_0_0_#11110F] transition-transform hover:-translate-y-0.5"
							>
								<Home className="h-4 w-4" />
								Back to home
							</a>
							<a
								href="/sign-up"
								className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-3 text-sm font-semibold text-[#11110F] shadow-[3px_3px_0_0_#11110F] transition-transform hover:-translate-y-0.5"
							>
								<UserPlus className="h-4 w-4" />
								Create your profile
							</a>
						</div>
					</div>
				</div>
			</div>
		);
	}

	const { profile, links } = data;
	const theme = getTheme(profile.theme ?? "default");

	const handleLinkClick = (linkId: string) => {
		recordClick.mutate({
			linkId,
			profileId: profile.id,
			referrer: typeof window !== "undefined" ? document.referrer : undefined,
			userAgent:
				typeof window !== "undefined" ? navigator.userAgent : undefined,
		});
	};

	return (
		<div
			className="min-h-screen"
			style={{
				background: theme.background,
				fontFamily: "'Work Sans', sans-serif",
			}}
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
									iconBgColor={link.iconBgColor}
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
							className="inline-flex items-center gap-1.5 text-xs hover:underline"
						>
							<span style={{ color: theme.mutedText }}>Powered by</span>
							<SiteBrand size="sm" textClassName="text-xs" />
						</a>
					</div>
				</div>
			</div>
		</div>
	);
}
