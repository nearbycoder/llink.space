import { useMutation } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { ChevronDown } from "lucide-react";
import { Fragment } from "react";
import { SiteBrand } from "#/components/SiteBrand";
import { useTRPC } from "#/integrations/trpc/react";
import type { TRPCRouter } from "#/integrations/trpc/router";
import { type ContentBlock, FONT_OPTIONS } from "#/lib/page-design";
import {
	getProfileBackgroundColorValue,
	getProfileBackgroundGradientValue,
} from "#/lib/profile-backgrounds";
import { isAllowedBackgroundImageUrl } from "#/lib/security";
import { getTheme } from "#/lib/themes";
import { ContentBlockView } from "./ContentBlockView";
import { EmailSignup } from "./EmailSignup";
import { LinkCard } from "./LinkCard";
import { ProfileHeader } from "./ProfileHeader";
import { PublicLinkCommandBar } from "./PublicLinkCommandBar";
import { PublicProfileShare } from "./PublicProfileShare";
export type PublicPageData =
	inferRouterOutputs<TRPCRouter>["links"]["getPublic"];
function toCssBackgroundImageUrl(value: string) {
	const safeValue = value.replace(/["\\\n\r\f]/g, "");
	return `url("${safeValue}")`;
}

function resolveProfileBackgroundStyle(
	profile: {
		pageBackgroundType?: string | null;
		pageBackgroundColor?: string | null;
		pageBackgroundGradient?: string | null;
		pageBackgroundImageUrl?: string | null;
	},
	fallbackBackground: string,
) {
	if (profile.pageBackgroundType === "color") {
		return {
			background: getProfileBackgroundColorValue(profile.pageBackgroundColor),
		};
	}

	if (
		profile.pageBackgroundType === "image" &&
		profile.pageBackgroundImageUrl &&
		isAllowedBackgroundImageUrl(profile.pageBackgroundImageUrl)
	) {
		return {
			backgroundColor: "#11110F",
			backgroundImage: `linear-gradient(130deg, rgba(17,17,15,0.45), rgba(17,17,15,0.2)), ${toCssBackgroundImageUrl(profile.pageBackgroundImageUrl)}`,
			backgroundPosition: "center",
			backgroundSize: "cover",
		};
	}

	if (profile.pageBackgroundType === "gradient") {
		return {
			background: getProfileBackgroundGradientValue(
				profile.pageBackgroundGradient,
			),
		};
	}

	return { background: fallbackBackground };
}

interface PublicProfileLink {
	featured?: boolean;
	featureImageUrl?: string | null;
	ctaLabel?: string | null;
	id: string;
	title: string;
	url: string;
	description: string | null;
	iconUrl: string | null;
	iconBgColor: string | null;
}

interface PublicLinkGroupProps {
	preview?: boolean;
	blocks: ContentBlock[];
	buttonStyle?: string;
	links: PublicProfileLink[];
	cardBg: string;
	cardBorder: string;
	textColor: string;
	mutedTextColor: string;
	onVisit: (linkId: string) => void;
}

const PUBLIC_LINK_PREVIEW_LIMIT = 5;

function PublicLinkGroup({
	preview,
	blocks,
	buttonStyle,
	links,
	cardBg,
	cardBorder,
	textColor,
	mutedTextColor,
	onVisit,
}: PublicLinkGroupProps) {
	const visibleLinks = links.slice(0, PUBLIC_LINK_PREVIEW_LIMIT);
	const remainingLinks = links.slice(PUBLIC_LINK_PREVIEW_LIMIT);
	const renderLink = (link: PublicProfileLink) => (
		<Fragment key={link.id}>
			<LinkCard
				buttonStyle={buttonStyle}
				featured={link.featured}
				featureImageUrl={link.featureImageUrl}
				ctaLabel={link.ctaLabel}
				id={link.id}
				title={link.title}
				url={link.url}
				description={link.description}
				iconUrl={link.iconUrl}
				iconBgColor={link.iconBgColor}
				cardBg={cardBg}
				cardBorder={cardBorder}
				textColor={textColor}
				mutedTextColor={mutedTextColor}
				onClickRecord={onVisit}
			/>
			{blocks
				.filter((b) => b.afterLinkId === link.id)
				.map((b) => (
					<ContentBlockView key={b.id} block={b} preview={preview} />
				))}
		</Fragment>
	);

	return (
		<div className="space-y-3">
			{visibleLinks.map(renderLink)}
			{remainingLinks.length > 0 && (
				<details className="group space-y-3">
					<summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-black/40 bg-[#FFFCEF]/80 px-4 py-2.5 text-xs font-semibold text-[#11110F] transition-colors hover:border-black hover:bg-[#FFF7A8] [&::-webkit-details-marker]:hidden">
						<span className="group-open:hidden">
							Show {remainingLinks.length} more
						</span>
						<span className="hidden group-open:inline">Show fewer</span>
						<ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
					</summary>
					<div className="space-y-3 pt-3">{remainingLinks.map(renderLink)}</div>
				</details>
			)}
		</div>
	);
}

export function PublicProfilePage({
	data,
	preview = false,
}: {
	data: PublicPageData;
	preview?: boolean;
}) {
	const trpc = useTRPC();
	const recordClick = useMutation(trpc.analytics.recordClick.mutationOptions());
	const { profile, links, sections, unsectionedLinks } = data;
	const theme = {
		...getTheme(profile.theme ?? "default"),
		...(profile.accentColor ? { accent: profile.accentColor } : {}),
	};
	const blocks = profile.contentBlocks ?? [];
	const visibleIds = new Set(links.map((l) => l.id));
	const pageBackgroundStyle = resolveProfileBackgroundStyle(
		profile,
		theme.background,
	);
	const sectionTitleByLinkId = new Map(
		sections.flatMap((section) =>
			section.links.map((link) => [link.id, section.title] as const),
		),
	);
	const commandLinks = links.map((link) => ({
		...link,
		sectionTitle: sectionTitleByLinkId.get(link.id) ?? null,
	}));

	const handleLinkClick = (linkId: string) => {
		if (preview) return;
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
			className={preview ? "min-h-full" : "min-h-screen"}
			inert={preview}
			style={{
				...pageBackgroundStyle,
				fontFamily:
					FONT_OPTIONS[profile.fontFamily as keyof typeof FONT_OPTIONS] ??
					FONT_OPTIONS.work,
				color: theme.text,
			}}
		>
			<div className="mx-auto max-w-md px-4 py-10 sm:py-16">
				<div
					className="rounded-2xl border-2 p-6 sm:p-7 shadow-[5px_5px_0_0_#11110F]"
					style={{
						backgroundColor: theme.cardBg,
						borderColor: theme.cardBorder,
					}}
				>
					{!preview && (
						<PublicProfileShare
							customDomain={data.customDomain}
							displayName={
								profile.displayName?.trim() || `@${profile.username}`
							}
							username={profile.username}
						/>
					)}
					<ProfileHeader
						profile={profile}
						fontFamily={
							FONT_OPTIONS[profile.fontFamily as keyof typeof FONT_OPTIONS]
						}
						accentColor={theme.accent}
						textColor={theme.text}
						mutedTextColor={theme.mutedText}
					/>
					<PublicLinkCommandBar
						links={commandLinks}
						onVisitLink={handleLinkClick}
					/>

					{blocks
						.filter((b) => !b.afterLinkId || !visibleIds.has(b.afterLinkId))
						.map((b) => (
							<ContentBlockView key={b.id} block={b} preview={preview} />
						))}
					{links.length > 0 ? (
						<div className="space-y-6">
							{unsectionedLinks.length > 0 && (
								<PublicLinkGroup
									preview={preview}
									blocks={blocks}
									buttonStyle={profile.buttonStyle}
									links={unsectionedLinks}
									cardBg={theme.cardBg}
									cardBorder={theme.cardBorder}
									textColor={theme.text}
									mutedTextColor={theme.mutedText}
									onVisit={handleLinkClick}
								/>
							)}

							{sections.map((section) => (
								<div key={section.id} className="space-y-3">
									<div className="relative py-1">
										<div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-black/20" />
										<p
											className="relative mx-auto w-fit rounded-full border-2 border-black/60  px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] shadow-[1px_1px_0_0_#11110F]"
											style={{
												color: theme.mutedText,
												backgroundColor: theme.cardBg,
											}}
										>
											{section.title}
										</p>
									</div>
									<PublicLinkGroup
										preview={preview}
										blocks={blocks}
										buttonStyle={profile.buttonStyle}
										links={section.links}
										cardBg={theme.cardBg}
										cardBorder={theme.cardBorder}
										textColor={theme.text}
										mutedTextColor={theme.mutedText}
										onVisit={handleLinkClick}
									/>
								</div>
							))}
						</div>
					) : (
						<p
							className="text-center text-sm"
							style={{ color: theme.mutedText, backgroundColor: theme.cardBg }}
						>
							No links yet
						</p>
					)}

					{profile.signupEnabled && (
						<EmailSignup
							profileId={profile.id}
							title={profile.signupTitle}
							creator={profile.displayName || profile.username}
							preview={preview}
						/>
					)}
					<div className="mt-12 text-center">
						<a
							href="https://llink.space/"
							className="inline-flex items-center gap-1.5 text-xs hover:underline"
						>
							<span
								style={{
									color: theme.mutedText,
									backgroundColor: theme.cardBg,
								}}
							>
								Powered by
							</span>
							<SiteBrand size="sm" textClassName="text-xs !text-current" />
						</a>
					</div>
				</div>
			</div>
		</div>
	);
}
