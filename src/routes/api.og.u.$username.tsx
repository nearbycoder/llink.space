import { ImageResponse } from "@vercel/og";
import { createFileRoute } from "@tanstack/react-router";
import { and, asc, eq } from "drizzle-orm";
import { Link2, type LucideIcon } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { db } from "#/db";
import { links, profiles } from "#/db/schema";
import { LINK_ICON_OPTIONS_BY_KEY } from "#/components/links/icon-options";
import { isLinkIconKey } from "#/lib/link-icon-keys";
import { normalizeObjectUrlForClient } from "#/lib/object-storage";
import { resolveSiteOrigin, toAbsoluteUrl } from "#/lib/site-url";

const WIDTH = 1200;
const HEIGHT = 630;
const MAX_LINKS = 4;
const lucideDataUriCache = new Map<string, string>();

function getLucideIconDataUri(
	Icon: LucideIcon,
	cacheKey: string,
	size: number,
	color: string,
) {
	const key = `${cacheKey}-${size}-${color}`;
	const cached = lucideDataUriCache.get(key);
	if (cached) return cached;

	const svg = renderToStaticMarkup(
		<Icon size={size} color={color} strokeWidth={2.2} />,
	);
	const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
	lucideDataUriCache.set(key, uri);
	return uri;
}

function LlinkBadge({ size = 34 }: { size?: number }) {
	const glyphSize = Math.round(size * 0.58);
	const glyphUrl = getLucideIconDataUri(
		Link2,
		"brand-link2",
		glyphSize,
		"#F5F3CF",
	);

	return (
		<div
			style={{
				display: "flex",
				width: size,
				height: size,
				borderRadius: Math.round(size * 0.28),
				padding: 2,
				background:
					"linear-gradient(128deg, #f5ff7b 0%, #8ae1e7 34%, #f2b7e2 68%, #ff8a4c 100%)",
				boxShadow: "0 2px 0 rgba(17,17,15,0.3)",
			}}
		>
			<div
				style={{
					display: "flex",
					width: "100%",
					height: "100%",
					alignItems: "center",
					justifyContent: "center",
					borderRadius: Math.round(size * 0.24),
					background: "#11110F",
				}}
			>
				<img
					src={glyphUrl}
					alt=""
					aria-hidden="true"
					width={glyphSize}
					height={glyphSize}
					style={{ width: glyphSize, height: glyphSize }}
				/>
			</div>
		</div>
	);
}

function clampText(value: string, maxLength: number) {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength - 1)}…`;
}

function hostnameFromUrl(url: string) {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}

function paletteFor(username: string) {
	let hash = 0;
	for (let i = 0; i < username.length; i += 1) {
		hash = (hash << 5) - hash + username.charCodeAt(i);
		hash |= 0;
	}

	const palettes = [
		{
			page: "linear-gradient(128deg, #93d5d8 0%, #bdeccf 42%, #d4c8f2 100%)",
			card: "#F4F2E8",
			accent: "#F5FF7B",
			muted: "#54534C",
			text: "#11110F",
		},
		{
			page: "linear-gradient(128deg, #ffd2a8 0%, #f9ddb7 38%, #d2e9f8 100%)",
			card: "#F4F2E8",
			accent: "#FFD9CF",
			muted: "#54534C",
			text: "#11110F",
		},
		{
			page: "linear-gradient(128deg, #a9e0d9 0%, #8fd1e7 44%, #d8c3ec 100%)",
			card: "#F4F2E8",
			accent: "#8AE1E7",
			muted: "#54534C",
			text: "#11110F",
		},
	];

	return palettes[Math.abs(hash) % palettes.length];
}

function avatarLetters(name: string) {
	const cleaned = name.replace(/[^A-Za-z0-9 ]/g, "").trim();
	if (!cleaned) return "L";
	const parts = cleaned.split(/\s+/);
	if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
	return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function normalizeImageUrl(url: string | null | undefined, origin: string) {
	if (!url) return null;
	const normalized = normalizeObjectUrlForClient(url);
	if (!normalized || typeof normalized !== "string") return null;
	return toAbsoluteUrl(normalized, origin);
}

function renderUnavailableImage(username: string) {
	const palette = paletteFor(username);

	return new ImageResponse(
		<div
			style={{
				display: "flex",
				width: "100%",
				height: "100%",
				justifyContent: "center",
				alignItems: "center",
				background: palette.page,
				fontFamily: "Arial, sans-serif",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					width: 1080,
					height: 520,
					padding: "36px 42px",
					borderRadius: 44,
					border: "4px solid #11110F",
					background: palette.card,
					boxShadow: "12px 12px 0 #11110F",
					transform: "rotate(-0.55deg)",
					color: palette.text,
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 18,
						width: 640,
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
						<LlinkBadge size={46} />
						<div
							style={{
								fontSize: 38,
								fontWeight: 900,
								fontFamily: "'Arial Black', Arial, sans-serif",
							}}
						>
							llink.space
						</div>
					</div>
					<div
						style={{
							fontSize: 66,
							lineHeight: 1,
							fontWeight: 900,
							fontFamily: "'Arial Black', Arial, sans-serif",
						}}
					>
						Profile missing
					</div>
					<div
						style={{ fontSize: 34, color: palette.muted, lineHeight: 1.2 }}
					>{`/u/${username} is unavailable`}</div>
				</div>

				<div
					style={{
						display: "flex",
						width: 260,
						height: 260,
						borderRadius: 9999,
						border: "4px solid #11110F",
						alignItems: "center",
						justifyContent: "center",
						background:
							"linear-gradient(135deg, #F5FF7B 0%, #8AE1E7 45%, #F2B7E2 100%)",
						boxShadow: "8px 8px 0 #11110F",
						fontSize: 116,
						fontWeight: 800,
					}}
				>
					?
				</div>
			</div>
		</div>,
		{
			width: WIDTH,
			height: HEIGHT,
			headers: {
				"Cache-Control": "public, max-age=300, s-maxage=3600",
			},
		},
	);
}

async function handler({
	params,
	request,
}: {
	params: { username: string };
	request: Request;
}) {
	const username = params.username.toLowerCase();
	const palette = paletteFor(username);
	const origin = resolveSiteOrigin(request);

	try {
		const [profile] = await db
			.select({
				id: profiles.id,
				username: profiles.username,
				displayName: profiles.displayName,
				bio: profiles.bio,
				avatarUrl: profiles.avatarUrl,
			})
			.from(profiles)
			.where(eq(profiles.username, username))
			.limit(1);

		if (!profile) {
			return renderUnavailableImage(params.username);
		}

		const publicLinks = await db
			.select({
				id: links.id,
				title: links.title,
				description: links.description,
				url: links.url,
				iconUrl: links.iconUrl,
				iconBgColor: links.iconBgColor,
			})
			.from(links)
			.where(and(eq(links.profileId, profile.id), eq(links.isActive, true)))
			.orderBy(asc(links.sortOrder), asc(links.createdAt), asc(links.id))
			.limit(MAX_LINKS);

		const displayName = profile.displayName?.trim() || `@${profile.username}`;
		const subtitle = profile.bio?.trim()
			? clampText(profile.bio.trim(), 92)
			: "This is my personal bio page";
		const avatarUrl = normalizeImageUrl(profile.avatarUrl, origin);

		return new ImageResponse(
			<div
				style={{
					display: "flex",
					width: "100%",
					height: "100%",
					justifyContent: "center",
					alignItems: "center",
					background: palette.page,
					fontFamily: "Arial, sans-serif",
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "stretch",
						gap: 26,
						width: 1080,
						height: 520,
						padding: "28px 32px",
						borderRadius: 44,
						border: "4px solid #11110F",
						background: palette.card,
						boxShadow: "12px 12px 0 #11110F",
						transform: "rotate(-0.55deg)",
						color: palette.text,
					}}
				>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "flex-start",
							justifyContent: "space-between",
							width: 350,
							padding: "4px 4px 8px",
						}}
					>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 12,
								width: "100%",
							}}
						>
							<div
								style={{
									display: "flex",
									flexDirection: "row",
									alignItems: "center",
									gap: 12,
									width: "100%",
								}}
							>
								<div
									style={{
										display: "flex",
										width: 108,
										height: 108,
										borderRadius: 9999,
										border: "4px solid #11110F",
										alignItems: "center",
										justifyContent: "center",
										background:
											"linear-gradient(135deg, #FFF5CC 0%, #FFD9CF 50%, #D8F6FB 100%)",
										boxShadow: "6px 6px 0 #11110F",
										overflow: "hidden",
										fontSize: 42,
										fontWeight: 800,
										flexShrink: 0,
									}}
								>
									{avatarUrl ? (
										<img
											src={avatarUrl}
											alt={`${displayName} avatar`}
											width={108}
											height={108}
											style={{
												width: "100%",
												height: "100%",
												objectFit: "cover",
											}}
										/>
									) : (
										avatarLetters(displayName)
									)}
								</div>
								<div
									style={{
										fontSize: 48,
										lineHeight: 1.02,
										fontWeight: 900,
										fontFamily: "'Arial Black', Arial, sans-serif",
										textAlign: "left",
									}}
								>
									{clampText(displayName, 18)}
								</div>
							</div>
							<div
								style={{
									width: "100%",
									fontSize: 22,
									color: palette.muted,
									textAlign: "left",
									lineHeight: 1.22,
								}}
							>
								{subtitle}
							</div>
						</div>

						<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
							<div style={{ fontSize: 23, color: palette.muted }}>
								Powered by
							</div>
							<LlinkBadge size={24} />
							<div
								style={{
									fontSize: 30,
									fontWeight: 900,
									fontFamily: "'Arial Black', Arial, sans-serif",
								}}
							>
								llink.space
							</div>
						</div>
					</div>

					<div
						style={{
							display: "flex",
							flexDirection: "column",
							justifyContent: "space-between",
							flex: 1,
							padding: "2px 2px 6px",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-end",
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									height: 48,
									padding: "0 18px",
									borderRadius: 9999,
									border: "3px solid #11110F",
									background: palette.accent,
									fontSize: 24,
									fontWeight: 800,
								}}
							>
								{`@${profile.username}`}
							</div>
						</div>

						<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
							{publicLinks.length > 0 ? (
								publicLinks.map((link) => {
									const iconValue = link.iconUrl?.trim() ?? "";
									const iconKey =
										iconValue && isLinkIconKey(iconValue) ? iconValue : null;
									const iconOption = iconKey
										? LINK_ICON_OPTIONS_BY_KEY[iconKey]
										: undefined;
									const iconImageUrl = !iconKey
										? normalizeImageUrl(iconValue, origin)
										: null;
									const iconGlyphUrl = iconOption
										? getLucideIconDataUri(
												iconOption.Icon,
												`link-${iconOption.key}`,
												28,
												"#11110F",
											)
										: null;
									const fallbackGlyphUrl = getLucideIconDataUri(
										Link2,
										"link-fallback",
										28,
										"#11110F",
									);
									const metaText = clampText(
										link.description?.trim() || hostnameFromUrl(link.url),
										36,
									);

									return (
										<div
											key={link.id}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 14,
												height: 88,
												padding: "0 16px",
												borderRadius: 24,
												border: "4px solid #11110F",
												background: "#FFFFFF",
												boxShadow: "6px 6px 0 #11110F",
											}}
										>
											<div
												style={{
													display: "flex",
													width: 54,
													height: 54,
													borderRadius: 16,
													border: "4px solid #11110F",
													background: link.iconBgColor ?? palette.accent,
													alignItems: "center",
													justifyContent: "center",
													overflow: "hidden",
												}}
											>
												{iconGlyphUrl ? (
													<img
														src={iconGlyphUrl}
														alt=""
														aria-hidden="true"
														width={28}
														height={28}
														style={{ width: 28, height: 28 }}
													/>
												) : iconImageUrl ? (
													<img
														src={iconImageUrl}
														alt=""
														aria-hidden="true"
														width={54}
														height={54}
														style={{
															width: "100%",
															height: "100%",
															objectFit: "cover",
														}}
													/>
												) : (
													<img
														src={fallbackGlyphUrl}
														alt=""
														aria-hidden="true"
														width={28}
														height={28}
														style={{ width: 28, height: 28 }}
													/>
												)}
											</div>
											<div
												style={{
													display: "flex",
													flexDirection: "column",
													gap: 2,
												}}
											>
												<div
													style={{
														fontSize: 38,
														lineHeight: 1,
														fontWeight: 700,
													}}
												>
													{clampText(link.title, 21)}
												</div>
												<div
													style={{
														fontSize: 22,
														color: palette.muted,
														lineHeight: 1.02,
													}}
												>
													{metaText}
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
										height: 88,
										borderRadius: 24,
										border: "4px solid #11110F",
										background: "#FFFFFF",
										boxShadow: "6px 6px 0 #11110F",
										fontSize: 30,
										color: palette.muted,
									}}
								>
									No links yet
								</div>
							)}
						</div>
					</div>
				</div>
			</div>,
			{
				width: WIDTH,
				height: HEIGHT,
				headers: {
					"Cache-Control": "public, max-age=300, s-maxage=3600",
				},
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
