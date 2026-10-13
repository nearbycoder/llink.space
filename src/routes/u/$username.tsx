import { createFileRoute } from "@tanstack/react-router";
import { TRPCClientError } from "@trpc/client";
import { Home, SearchX, UserPlus } from "lucide-react";
import { PublicProfilePage } from "#/components/profile/PublicProfilePage";
import { SiteBrand } from "#/components/SiteBrand";
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
		const pageUrl = loaderData?.data?.customDomain
			? `https://${loaderData.data.customDomain}/`
			: toAbsoluteUrl(`/u/${encodedUsername}`);
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
			<div className="auth-workspace flex min-h-screen flex-col px-5 py-6">
				<a href="/" className="w-fit" aria-label="llink.space home">
					<SiteBrand size="md" />
				</a>
				<div className="mx-auto grid w-full max-w-4xl flex-1 items-center gap-12 py-14 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
					<div>
						<p className="eyebrow inline-flex items-center gap-2">
							<SearchX className="h-3.5 w-3.5" aria-hidden="true" />
							Missing profile
						</p>
						<h1 className="font-display mt-4 text-5xl leading-[1.02] font-semibold tracking-[-0.035em] sm:text-6xl">
							That page is <em className="text-signal-strong">not here.</em>
						</h1>
						<p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
							We could not find{" "}
							<span className="rounded-md bg-card px-2 py-0.5 font-mono text-[0.9em] text-foreground shadow-[inset_0_0_0_1px_var(--border)]">
								/u/{username}
							</span>
							. It may be misspelled, removed, or not claimed yet.
						</p>
						<div className="mt-8 flex flex-wrap gap-3">
							<a
								href="/sign-up"
								className="inline-flex h-11 items-center gap-2 rounded-full bg-signal px-5 text-sm font-semibold text-ink transition-colors hover:bg-[#ff7a45]"
							>
								<UserPlus className="h-4 w-4" aria-hidden="true" />
								Create your profile
							</a>
							<a
								href="/"
								className="inline-flex h-11 items-center gap-2 rounded-full border border-border-strong bg-card px-5 text-sm font-semibold transition-colors hover:bg-accent"
							>
								<Home className="h-4 w-4" aria-hidden="true" />
								Back to home
							</a>
						</div>
					</div>
					<div
						aria-hidden="true"
						className="relative mx-auto w-full max-w-[17rem] rotate-[3deg] rounded-[2rem] border border-border bg-card p-6 shadow-[0_40px_80px_-40px_rgb(22_20_15/0.5)]"
					>
						<div className="mx-auto flex size-16 items-center justify-center rounded-full border-2 border-dashed border-border-strong font-display text-2xl font-semibold text-muted-foreground">
							?
						</div>
						<p className="mt-4 text-center font-mono text-xs text-muted-foreground">
							@{username}
						</p>
						<div className="mt-5 space-y-2">
							<div className="h-11 rounded-2xl border border-dashed border-border-strong" />
							<div className="h-11 rounded-2xl border border-dashed border-border-strong" />
							<div className="h-11 rounded-2xl border border-dashed border-border-strong" />
						</div>
						<span className="absolute -top-3 -right-3 rounded-full bg-ink px-3 py-1 font-mono text-[11px] text-[#faf8f3]">
							404
						</span>
					</div>
				</div>
			</div>
		);
	}

	return <PublicProfilePage data={data} />;
}
