import { createFileRoute } from "@tanstack/react-router";
import { TRPCClientError } from "@trpc/client";
import { Home, SearchX, UserPlus } from "lucide-react";
import { PublicProfilePage } from "#/components/profile/PublicProfilePage";
import { toAbsoluteUrl } from "#/lib/site-url";

function trimForMeta(value: string, maxLength: number) {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength - 1)}…`;
}

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
	head: ({ params, loaderData }) => {
		const encodedUsername = encodeURIComponent(params.username);
		const pageUrl = toAbsoluteUrl(`/u/${encodedUsername}`);
		const ogImageUrl = toAbsoluteUrl(`/api/og/u/${encodedUsername}`);

		if (!loaderData?.data) {
			return {
				meta: [
					{ title: `@${params.username} not found | llink.space` },
					{
						name: "description",
						content: `No public profile exists for @${params.username} on llink.space.`,
					},
					{
						name: "robots",
						content: "noindex, nofollow, noarchive",
					},
					{
						property: "og:title",
						content: `@${params.username} not found | llink.space`,
					},
					{
						property: "og:description",
						content: `No public profile exists for @${params.username}.`,
					},
					{
						property: "og:type",
						content: "website",
					},
					{
						property: "og:url",
						content: pageUrl,
					},
					{
						property: "og:image",
						content: ogImageUrl,
					},
					{
						name: "twitter:card",
						content: "summary_large_image",
					},
					{
						name: "twitter:title",
						content: `@${params.username} not found | llink.space`,
					},
					{
						name: "twitter:description",
						content: `No public profile exists for @${params.username}.`,
					},
					{
						name: "twitter:image",
						content: ogImageUrl,
					},
				],
				links: [{ rel: "canonical", href: pageUrl }],
			};
		}

		const { profile, links } = loaderData.data;
		const displayName = profile.displayName?.trim() || `@${profile.username}`;
		const defaultDescription = `${displayName} shares ${links.length} link${links.length === 1 ? "" : "s"} on llink.space.`;
		const description = profile.bio?.trim()
			? trimForMeta(profile.bio.trim(), 160)
			: defaultDescription;
		const title = `${displayName} | llink.space`;
		const sameAs = Array.from(
			new Set(
				links
					.map((link) => link.url?.trim())
					.filter((url): url is string => Boolean(url)),
			),
		);
		const profileImage = profile.avatarUrl?.trim()
			? toAbsoluteUrl(profile.avatarUrl)
			: undefined;
		const structuredData = {
			"@context": "https://schema.org",
			"@type": "Person",
			name: displayName,
			alternateName: `@${profile.username}`,
			url: pageUrl,
			description,
			mainEntityOfPage: pageUrl,
			...(profileImage ? { image: profileImage } : {}),
			...(sameAs.length > 0 ? { sameAs } : {}),
		};

		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ property: "og:title", content: title },
				{ property: "og:description", content: description },
				{ property: "og:type", content: "profile" },
				{ property: "og:url", content: pageUrl },
				{ property: "og:image", content: ogImageUrl },
				{ property: "og:image:width", content: "1200" },
				{ property: "og:image:height", content: "630" },
				{
					property: "og:image:alt",
					content: `Preview of ${displayName} on llink.space`,
				},
				{ name: "twitter:card", content: "summary_large_image" },
				{ name: "twitter:title", content: title },
				{ name: "twitter:description", content: description },
				{ name: "twitter:image", content: ogImageUrl },
				{
					name: "twitter:image:alt",
					content: `Preview of ${displayName} on llink.space`,
				},
			],
			scripts: [
				{
					type: "application/ld+json",
					children: JSON.stringify(structuredData),
				},
			],
			links: [{ rel: "canonical", href: pageUrl }],
		};
	},
	component: ProfilePage,
});

function ProfilePage() {
	const { data } = Route.useLoaderData();
	const { username } = Route.useParams();

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

	return <PublicProfilePage data={data} />;
}
