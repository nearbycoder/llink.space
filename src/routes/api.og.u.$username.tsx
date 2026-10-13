import { createFileRoute } from "@tanstack/react-router";
import { ImageResponse } from "@vercel/og";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { Link2 } from "lucide-react";
import { LINK_ICON_OPTIONS_BY_KEY } from "#/components/links/icon-options";
import { db } from "#/db";
import { linkSections, links, profiles } from "#/db/schema";
import { isLinkIconKey } from "#/lib/link-icon-keys";
import { publishedLinkFilter } from "#/lib/link-publishing-server";
import {
	clampText,
	loadOgFonts,
	lucideDataUri,
	OG_CACHE_HEADERS,
	OG_HEIGHT,
	OG_INK,
	OG_MUTED,
	OG_PAPER,
	OG_SIGNAL,
	OG_SIGNAL_STRONG,
	OG_WIDTH,
	OgBrandMark,
	OgWordmark,
} from "#/lib/og-brand.server";
import { storedPreviewImage } from "#/lib/og-image";
import { getTheme } from "#/lib/themes";
import { DEFAULT_ICON_BG_COLOR, readableTextColor } from "#/lib/utils";

const MAX_LINKS = 4;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function hostnameFromUrl(url: string) {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}

function avatarLetters(name: string) {
	const cleaned = name.replace(/[^\p{L}\p{N} ]/gu, "").trim();
	if (!cleaned) return "L";
	const parts = cleaned.split(/\s+/);
	if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
	return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

/** Satori needs simple values: flat theme colors or the default paper glow. */
function ogPalette(themeId: string | null, accentColor: string | null) {
	const theme = getTheme(themeId ?? "default");
	const accent =
		accentColor && HEX_COLOR.test(accentColor) ? accentColor : theme.accent;
	return {
		page: HEX_COLOR.test(theme.background) ? theme.background : OG_PAPER,
		glow: !HEX_COLOR.test(theme.background),
		card: theme.cardBg,
		text: theme.text,
		muted: theme.mutedText,
		line: `${theme.cardBorder}26`,
		accent: HEX_COLOR.test(accent) ? accent : OG_SIGNAL,
	};
}

const PAPER_WASH =
	"linear-gradient(135deg, #FFDCC8 0%, #F5F3EE 42%, #F5F3EE 62%, #DEE4FA 100%)";

async function renderUnavailableImage(username: string) {
	const fonts = await loadOgFonts();
	const handle = clampText(username, 24);
	return new ImageResponse(
		<div
			style={{
				display: "flex",
				position: "relative",
				width: "100%",
				height: "100%",
				background: PAPER_WASH,
				fontFamily: "Geist",
				color: OG_INK,
				overflow: "hidden",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
					width: "100%",
					padding: "64px 72px 60px",
				}}
			>
				<OgWordmark size={44} />
				<div style={{ display: "flex", flexDirection: "column" }}>
					<div
						style={{
							fontFamily: "Geist Mono",
							fontSize: 26,
							color: OG_MUTED,
						}}
					>
						{`llink.space/u/${handle}`}
					</div>
					<div
						style={{
							marginTop: 18,
							fontFamily: "Fraunces",
							fontWeight: 600,
							fontSize: 84,
							lineHeight: 1,
							letterSpacing: "-0.045em",
						}}
					>
						This page isn’t here
					</div>
					<div
						style={{
							fontFamily: "Fraunces",
							fontStyle: "italic",
							fontWeight: 500,
							fontSize: 84,
							lineHeight: 1.1,
							letterSpacing: "-0.045em",
							color: OG_SIGNAL_STRONG,
						}}
					>
						yet.
					</div>
				</div>
				<div style={{ display: "flex", fontSize: 26, color: OG_MUTED }}>
					Make a page for everything you share on llink.space
				</div>
			</div>
		</div>,
		{
			width: OG_WIDTH,
			height: OG_HEIGHT,
			fonts,
			headers: OG_CACHE_HEADERS,
		},
	);
}

async function handler({ params }: { params: { username: string } }) {
	const username = params.username.toLowerCase();
	try {
		const [profile] = await db
			.select({
				id: profiles.id,
				username: profiles.username,
				displayName: profiles.displayName,
				bio: profiles.bio,
				avatarUrl: profiles.avatarUrl,
				theme: profiles.theme,
				accentColor: profiles.accentColor,
			})
			.from(profiles)
			.where(eq(profiles.username, username))
			.limit(1);
		if (!profile) {
			return renderUnavailableImage(params.username);
		}
		const [publicLinks, [linkTotal], fonts] = await Promise.all([
			db
				.select({
					id: links.id,
					title: links.title,
					description: links.description,
					url: links.url,
					iconUrl: links.iconUrl,
					iconBgColor: links.iconBgColor,
				})
				.from(links)
				.leftJoin(linkSections, eq(links.sectionId, linkSections.id))
				.where(and(eq(links.profileId, profile.id), publishedLinkFilter()))
				.orderBy(
					sql`coalesce(${linkSections.sortOrder}, -1)`,
					asc(links.sortOrder),
					asc(links.createdAt),
					asc(links.id),
				)
				.limit(MAX_LINKS),
			db
				.select({ value: count() })
				.from(links)
				.where(and(eq(links.profileId, profile.id), publishedLinkFilter())),
			loadOgFonts(),
		]);
		const palette = ogPalette(profile.theme, profile.accentColor);
		const displayName = profile.displayName?.trim() || `@${profile.username}`;
		const bio = profile.bio?.trim()
			? clampText(profile.bio.trim(), 120)
			: "Links, updates and everything in between.";
		const [avatarUrl, ...iconImages] = await Promise.all([
			storedPreviewImage(profile.avatarUrl),
			...publicLinks.map((link) => storedPreviewImage(link.iconUrl)),
		]);
		const iconImagesById = new Map(
			publicLinks.map((link, index) => [link.id, iconImages[index]]),
		);
		const remaining = Math.max(0, (linkTotal?.value ?? 0) - publicLinks.length);
		const nameSize = displayName.length > 18 ? 58 : 72;

		return new ImageResponse(
			<div
				style={{
					display: "flex",
					position: "relative",
					width: "100%",
					height: "100%",
					background: palette.glow ? PAPER_WASH : palette.page,
					fontFamily: "Geist",
					color: palette.text,
					overflow: "hidden",
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						justifyContent: "space-between",
						width: 610,
						padding: "60px 0 56px 72px",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							width: 132,
							height: 132,
							borderRadius: 999,
							padding: 5,
							background: palette.accent,
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								width: "100%",
								height: "100%",
								borderRadius: 999,
								border: `5px solid ${palette.page}`,
								overflow: "hidden",
								background: palette.accent,
								color: readableTextColor(palette.accent),
								fontFamily: "Fraunces",
								fontWeight: 600,
								fontSize: 52,
							}}
						>
							{avatarUrl ? (
								<img
									src={avatarUrl}
									alt=""
									width={112}
									height={112}
									style={{ width: "100%", height: "100%", objectFit: "cover" }}
								/>
							) : (
								avatarLetters(displayName)
							)}
						</div>
					</div>
					<div style={{ display: "flex", flexDirection: "column" }}>
						<div
							style={{
								fontFamily: "Fraunces",
								fontWeight: 600,
								fontSize: nameSize,
								lineHeight: 1.02,
								letterSpacing: "-0.04em",
							}}
						>
							{clampText(displayName, 30)}
						</div>
						<div
							style={{
								marginTop: 10,
								fontFamily: "Geist Mono",
								fontSize: 24,
								color: palette.muted,
							}}
						>
							{`@${clampText(profile.username, 28)}`}
						</div>
						<div
							style={{
								marginTop: 22,
								fontSize: 27,
								lineHeight: 1.38,
								color: palette.muted,
								maxWidth: 500,
							}}
						>
							{bio}
						</div>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
						<OgBrandMark size={34} />
						<div
							style={{
								fontFamily: "Geist Mono",
								fontSize: 21,
								color: palette.muted,
							}}
						>
							{`llink.space/u/${clampText(profile.username, 24)}`}
						</div>
					</div>
				</div>

				<div
					style={{
						display: "flex",
						position: "absolute",
						right: 64,
						top: 56,
						bottom: 56,
						width: 470,
						flexDirection: "column",
						justifyContent: "center",
						gap: 14,
						padding: "28px 26px",
						borderRadius: 36,
						background: palette.card,
						border: `1.5px solid ${palette.line}`,
						boxShadow: "0 40px 80px -36px rgba(22,20,15,0.45)",
					}}
				>
					{publicLinks.length > 0 ? (
						publicLinks.map((link) => {
							const iconValue = link.iconUrl?.trim() ?? "";
							const iconKey =
								iconValue && isLinkIconKey(iconValue) ? iconValue : null;
							const iconOption = iconKey
								? LINK_ICON_OPTIONS_BY_KEY[iconKey]
								: undefined;
							const iconImageUrl = !iconKey
								? iconImagesById.get(link.id)
								: null;
							const tile =
								link.iconBgColor && HEX_COLOR.test(link.iconBgColor)
									? link.iconBgColor
									: DEFAULT_ICON_BG_COLOR;
							const glyphColor = readableTextColor(tile);
							const glyph = iconOption
								? lucideDataUri(
										iconOption.Icon,
										`link-${iconOption.key}`,
										26,
										glyphColor,
									)
								: lucideDataUri(Link2, "link-fallback", 26, glyphColor);
							return (
								<div
									key={link.id}
									style={{
										display: "flex",
										alignItems: "center",
										gap: 16,
										padding: "14px 16px",
										borderRadius: 22,
										border: `1.5px solid ${palette.line}`,
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											width: 54,
											height: 54,
											flexShrink: 0,
											borderRadius: 16,
											background: tile,
											overflow: "hidden",
										}}
									>
										<img
											src={iconImageUrl ?? glyph}
											alt=""
											width={iconImageUrl ? 54 : 26}
											height={iconImageUrl ? 54 : 26}
											style={
												iconImageUrl
													? { width: 54, height: 54, objectFit: "cover" }
													: { width: 26, height: 26 }
											}
										/>
									</div>
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											minWidth: 0,
										}}
									>
										<div style={{ fontSize: 25, fontWeight: 600 }}>
											{clampText(link.title, 26)}
										</div>
										<div style={{ fontSize: 18, color: palette.muted }}>
											{clampText(
												link.description?.trim() || hostnameFromUrl(link.url),
												38,
											)}
										</div>
									</div>
								</div>
							);
						})
					) : (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								height: 120,
								borderRadius: 22,
								border: `1.5px dashed ${palette.line}`,
								fontSize: 24,
								color: palette.muted,
							}}
						>
							New links coming soon
						</div>
					)}
					{remaining > 0 && (
						<div
							style={{
								display: "flex",
								justifyContent: "center",
								marginTop: 2,
								fontFamily: "Geist Mono",
								fontSize: 18,
								color: palette.muted,
							}}
						>
							{`+ ${remaining} more link${remaining === 1 ? "" : "s"}`}
						</div>
					)}
				</div>
			</div>,
			{
				width: OG_WIDTH,
				height: OG_HEIGHT,
				fonts,
				headers: OG_CACHE_HEADERS,
			},
		);
	} catch (error) {
		console.error("OG image generation failed", { username, error });
		return renderUnavailableImage(params.username);
	}
}

export const Route = createFileRoute("/api/og/u/$username")({
	server: {
		handlers: {
			GET: handler,
		},
	},
});
