import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "#/components/marketing/LandingPage";
import { PublicProfilePage } from "#/components/profile/PublicProfilePage";
import { getCustomDomainPage } from "#/lib/custom-domain-page";
import { toAbsoluteUrl } from "#/lib/site-url";

export const Route = createFileRoute("/")({
	loader: async () => ({ customPage: await getCustomDomainPage() }),
	head: ({ loaderData }) => {
		if (loaderData?.customPage) {
			const { profile, customDomain } = loaderData.customPage;
			const title = profile.displayName || profile.username;
			const url = `https://${customDomain}/`;
			return {
				meta: [
					{ title: `${title} | llink.space` },
					{
						name: "description",
						content: profile.bio || `${title} — links and updates`,
					},
					{ property: "og:title", content: title },
					{ property: "og:url", content: url },
					{
						property: "og:image",
						content: toAbsoluteUrl(`/api/og/u/${profile.username}`),
					},
					{ name: "twitter:card", content: "summary_large_image" },
				],
				links: [{ rel: "canonical", href: url }],
			};
		}

		const title = "llink.space — Your Link-in-Bio Home Base";
		const description =
			"Build a link-in-bio page that feels like you. Explore 20 new tools for design, link organization, QR sharing, events, reading lists, and more. Watch the real product demo.";
		const pageUrl = toAbsoluteUrl("/");
		const ogImageUrl = toAbsoluteUrl("/api/og");
		const signUpUrl = toAbsoluteUrl("/sign-up");
		const structuredData = {
			"@context": "https://schema.org",
			"@type": "WebSite",
			name: "llink.space",
			url: pageUrl,
			description,
			potentialAction: {
				"@type": "RegisterAction",
				target: signUpUrl,
			},
			publisher: {
				"@type": "Organization",
				name: "llink.space",
				url: pageUrl,
			},
		};

		return {
			meta: [
				{ title },
				{ name: "description", content: description },
				{ property: "og:title", content: title },
				{ property: "og:description", content: description },
				{ property: "og:type", content: "website" },
				{ property: "og:url", content: pageUrl },
				{ property: "og:image", content: ogImageUrl },
				{ property: "og:image:width", content: "1200" },
				{ property: "og:image:height", content: "630" },
				{
					property: "og:image:alt",
					content: "llink.space link-in-bio homepage preview",
				},
				{ name: "twitter:card", content: "summary_large_image" },
				{ name: "twitter:title", content: title },
				{ name: "twitter:description", content: description },
				{ name: "twitter:image", content: ogImageUrl },
				{ name: "twitter:image:alt", content: "llink.space homepage preview" },
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
	component: SiteIndex,
});

function SiteIndex() {
	const { customPage } = Route.useLoaderData();
	return customPage ? <PublicProfilePage data={customPage} /> : <LandingPage />;
}
