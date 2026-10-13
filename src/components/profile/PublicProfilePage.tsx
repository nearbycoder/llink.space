import { useMutation } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { ChevronDown } from "lucide-react";
import { type CSSProperties, Fragment } from "react";
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
import { useReadingList } from "#/lib/use-reading-list";
import { ContactDownload } from "./ContactDownload";
import { ContentBlockView } from "./ContentBlockView";
import { EmailSignup } from "./EmailSignup";
import { LinkCard } from "./LinkCard";
import { ProfileHeader } from "./ProfileHeader";
import { PublicLinkCommandBar } from "./PublicLinkCommandBar";
import { PublicPrint } from "./PublicPrint";
import { PublicProfileShare } from "./PublicProfileShare";
import { ReadingList } from "./ReadingList";
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
			backgroundColor: "#16140F",
			backgroundImage: `linear-gradient(180deg, rgba(22,20,15,0.35), rgba(22,20,15,0.15)), ${toCssBackgroundImageUrl(profile.pageBackgroundImageUrl)}`,
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
	savedIds?: string[];
	saveReady?: boolean;
	onToggleSave?: (id: string) => void;
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
	savedIds,
	saveReady,
	onToggleSave,
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
				saved={savedIds?.includes(link.id)}
				saveReady={saveReady}
				onToggleSave={onToggleSave}
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
		<div className="space-y-2.5">
			{visibleLinks.map(renderLink)}
			{remainingLinks.length > 0 && (
				<details className="group space-y-2.5">
					<summary className="public-profile-more [&::-webkit-details-marker]:hidden">
						<span className="group-open:hidden">
							Show {remainingLinks.length} more
						</span>
						<span className="hidden group-open:inline">Show fewer</span>
						<ChevronDown
							aria-hidden="true"
							className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
						/>
					</summary>
					<div className="space-y-2.5">{remainingLinks.map(renderLink)}</div>
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
	const reading = useReadingList(
		profile.id,
		links.map((l) => l.id),
		!preview,
	);
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

	const displayName = profile.displayName?.trim() || `@${profile.username}`;

	return (
		<div
			data-public-profile={!preview || undefined}
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
			<div className="mx-auto max-w-[34rem] px-3 py-4 sm:px-4 sm:py-12">
				<div
					className="public-profile-surface rounded-[1.75rem] border px-5 pt-4 pb-7 sm:px-8 sm:pt-5 sm:pb-9"
					style={
						{
							backgroundColor: theme.cardBg,
							borderColor: `color-mix(in srgb, ${theme.cardBorder} 14%, transparent)`,
							"--public-card-bg": theme.cardBg,
						} as CSSProperties
					}
				>
					{!preview && (
						<PublicProfileShare
							customDomain={data.customDomain}
							displayName={displayName}
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
					<div
						data-print-hidden
						className="mb-6 flex flex-wrap items-start gap-2"
					>
						<PublicLinkCommandBar
							links={commandLinks}
							onVisitLink={handleLinkClick}
						/>
						{!preview && (
							<ReadingList
								links={links.filter((l) => reading.ids.includes(l.id))}
								onRemove={reading.toggle}
								onClear={reading.clear}
								onUndo={reading.undo}
								canUndo={reading.canUndo}
								onVisit={handleLinkClick}
								error={reading.error}
							/>
						)}
					</div>

					{sections.length > 1 && (
						<nav
							aria-label="Jump to section"
							data-print-hidden
							className="-mx-1 mb-7"
						>
							<p
								className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
								style={{ color: theme.mutedText }}
							>
								On this page
							</p>
							<div className="flex flex-wrap gap-1.5">
								{sections.map((section) => (
									<a
										key={section.id}
										href={`#section-${section.id}`}
										className="public-profile-chip"
									>
										{section.title}
									</a>
								))}
							</div>
						</nav>
					)}
					{blocks
						.filter((b) => !b.afterLinkId || !visibleIds.has(b.afterLinkId))
						.map((b) => (
							<ContentBlockView key={b.id} block={b} preview={preview} />
						))}
					{links.length > 0 ? (
						<div className="space-y-8">
							{unsectionedLinks.length > 0 && (
								<PublicLinkGroup
									savedIds={reading.ids}
									saveReady={reading.ready}
									onToggleSave={preview ? undefined : reading.toggle}
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
								<section
									key={section.id}
									id={`section-${section.id}`}
									aria-label={section.title}
									className="scroll-mt-6 space-y-3"
								>
									<div className="flex items-center gap-3">
										<h2
											className="max-w-full shrink-0 break-words text-[11px] font-semibold uppercase tracking-[0.14em]"
											style={{ color: theme.mutedText }}
										>
											{section.title}
										</h2>
										<span
											aria-hidden="true"
											className="h-px flex-1"
											style={{
												backgroundColor: `color-mix(in srgb, ${theme.cardBorder} 14%, transparent)`,
											}}
										/>
										<span
											aria-hidden="true"
											className="text-[11px] tabular-nums"
											style={{ color: theme.mutedText }}
										>
											{section.links.length}
										</span>
									</div>
									<PublicLinkGroup
										savedIds={reading.ids}
										saveReady={reading.ready}
										onToggleSave={preview ? undefined : reading.toggle}
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
								</section>
							))}
						</div>
					) : (
						<p
							className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm"
							style={{
								color: theme.mutedText,
								borderColor: `color-mix(in srgb, ${theme.cardBorder} 22%, transparent)`,
							}}
						>
							No links yet
						</p>
					)}

					{profile.signupEnabled && (
						<div data-print-hidden>
							<EmailSignup
								profileId={profile.id}
								title={profile.signupTitle}
								creator={profile.displayName || profile.username}
								preview={preview}
							/>
						</div>
					)}
					<footer className="mt-12 flex flex-col items-center gap-5">
						{!preview && (
							<div
								data-print-hidden
								className="flex flex-wrap justify-center gap-2"
							>
								<PublicPrint />
								<ContactDownload
									name={profile.displayName || profile.username}
									bio={profile.bio}
									username={profile.username}
									customDomain={data.customDomain}
								/>
							</div>
						)}
						<a href="https://llink.space/" className="public-profile-badge">
							<span style={{ color: theme.mutedText }}>Made with</span>
							<SiteBrand size="sm" textClassName="text-xs !text-current" />
						</a>
					</footer>
				</div>
			</div>
		</div>
	);
}
