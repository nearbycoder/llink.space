import { ImageResponse } from "@vercel/og";
import { and, asc, eq } from "drizzle-orm";
import { createFileRoute } from "@tanstack/react-router";
import { db } from "#/db";
import { links, profiles } from "#/db/schema";
import { normalizeObjectUrlForClient } from "#/lib/object-storage";
import { resolveSiteOrigin, toAbsoluteUrl } from "#/lib/site-url";

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;
const MAX_LINKS_IN_IMAGE = 5;

const paletteOptions = [
	{
		background:
			"linear-gradient(135deg, #93d5d8 0%, #c8f1b9 38%, #d9d5ff 100%)",
		card: "#11110F",
		accent: "#f5ff7b",
		text: "#fffcef",
		muted: "#d9d9d4",
	},
	{
		background:
			"linear-gradient(140deg, #ffd2a8 0%, #ffd9cf 42%, #f2b7e2 100%)",
		card: "#11110F",
		accent: "#8ae1e7",
		text: "#fffcef",
		muted: "#d9d9d4",
	},
	{
		background:
			"linear-gradient(120deg, #d2f6ff 0%, #bff1d2 35%, #ffe5b7 100%)",
		card: "#11110F",
		accent: "#ffd9cf",
		text: "#fffcef",
		muted: "#d9d9d4",
	},
];

function hashText(value: string) {
	let hash = 0;
	for (let i = 0; i < value.length; i += 1) {
		hash = (hash << 5) - hash + value.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
}

function trimText(value: string, maxLength: number) {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength - 1)}…`;
}

function toHostname(rawUrl: string) {
	try {
		return new URL(rawUrl).hostname.replace(/^www\./, "");
	} catch {
		return rawUrl;
	}
}

function extractUsernameFromRequest(request: Request) {
	const pathname = new URL(request.url).pathname;
	const matched = pathname.match(/^\/api\/og\/u\/([^/]+)$/);
	if (!matched) return null;

	try {
		return decodeURIComponent(matched[1]);
	} catch {
		return matched[1];
	}
}

function buildOgHeaders() {
	return {
		"cache-control":
			"public, max-age=0, s-maxage=900, stale-while-revalidate=86400",
		"content-type": "image/png",
	};
}

export const Route = createFileRoute("/api/og/u/$username")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const usernameInput = extractUsernameFromRequest(request);
				if (!usernameInput) {
					return new Response("Bad Request", { status: 400 });
				}

				const normalizedUsername = usernameInput.toLowerCase();
				const origin = resolveSiteOrigin(request);
				const palette =
					paletteOptions[hashText(normalizedUsername) % paletteOptions.length];

				const profile = await db.query.profiles.findFirst({
					where: eq(profiles.username, normalizedUsername),
				});

				if (!profile) {
					return new ImageResponse(
						<div
							style={{
								height: "100%",
								width: "100%",
								display: "flex",
								background: palette.background,
								padding: 44,
								fontFamily: "Verdana, sans-serif",
							}}
						>
							<div
								style={{
									width: "100%",
									display: "flex",
									flexDirection: "column",
									justifyContent: "space-between",
									borderRadius: 42,
									background: palette.card,
									border: `6px solid ${palette.accent}`,
									padding: 42,
									color: palette.text,
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
									<div
										style={{
											height: 54,
											width: 54,
											borderRadius: 9999,
											background: palette.accent,
											color: "#11110F",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontSize: 26,
											fontWeight: 700,
										}}
									>
										@
									</div>
									<div
										style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.05 }}
									>
										/{usernameInput}
									</div>
								</div>
								<div
									style={{
										fontSize: 24,
										color: palette.muted,
										lineHeight: 1.4,
									}}
								>
									This profile does not exist on llink.space.
								</div>
							</div>
						</div>,
						{
							width: OG_IMAGE_WIDTH,
							height: OG_IMAGE_HEIGHT,
							headers: buildOgHeaders(),
						},
					);
				}

				const publicLinks = await db.query.links.findMany({
					where: and(eq(links.profileId, profile.id), eq(links.isActive, true)),
					orderBy: [asc(links.sortOrder), asc(links.createdAt), asc(links.id)],
				});

				const topLinks = publicLinks.slice(0, MAX_LINKS_IN_IMAGE);
				const displayName =
					profile.displayName?.trim() || `@${profile.username}`;
				const subtitle = profile.bio?.trim()
					? trimText(profile.bio.trim(), 110)
					: `${publicLinks.length} link${publicLinks.length === 1 ? "" : "s"} on llink.space`;

				const normalizedAvatar = profile.avatarUrl
					? normalizeObjectUrlForClient(profile.avatarUrl)
					: null;
				const avatarUrl = normalizedAvatar
					? toAbsoluteUrl(normalizedAvatar, origin)
					: null;

				return new ImageResponse(
					<div
						style={{
							height: "100%",
							width: "100%",
							display: "flex",
							background: palette.background,
							padding: 44,
							fontFamily: "Verdana, sans-serif",
							position: "relative",
						}}
					>
						<div
							style={{
								position: "absolute",
								right: -120,
								top: -90,
								height: 360,
								width: 360,
								borderRadius: 9999,
								background: "rgba(255,255,255,0.22)",
							}}
						/>
						<div
							style={{
								position: "absolute",
								left: -90,
								bottom: -120,
								height: 280,
								width: 280,
								borderRadius: 9999,
								background: "rgba(255,255,255,0.18)",
							}}
						/>

						<div
							style={{
								width: "100%",
								display: "flex",
								flexDirection: "column",
								justifyContent: "space-between",
								borderRadius: 42,
								background: palette.card,
								border: `6px solid ${palette.accent}`,
								padding: 40,
								color: palette.text,
								boxShadow: "0 16px 42px rgba(0,0,0,0.24)",
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: 24,
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: 18 }}>
									{avatarUrl ? (
										<img
											src={avatarUrl}
											alt={`${displayName} avatar`}
											width={90}
											height={90}
											style={{
												borderRadius: 9999,
												border: `4px solid ${palette.accent}`,
												objectFit: "cover",
											}}
										/>
									) : (
										<div
											style={{
												height: 90,
												width: 90,
												borderRadius: 9999,
												border: `4px solid ${palette.accent}`,
												background: palette.accent,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												color: "#11110F",
												fontSize: 40,
												fontWeight: 700,
											}}
										>
											{displayName.charAt(0).toUpperCase()}
										</div>
									)}
									<div
										style={{ display: "flex", flexDirection: "column", gap: 5 }}
									>
										<div
											style={{
												fontSize: 48,
												fontWeight: 800,
												lineHeight: 1.03,
											}}
										>
											{trimText(displayName, 32)}
										</div>
										<div style={{ fontSize: 27, color: palette.muted }}>
											@{profile.username}
										</div>
									</div>
								</div>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										alignItems: "flex-end",
										gap: 6,
									}}
								>
									<div style={{ fontSize: 21, color: palette.muted }}>
										Powered by
									</div>
									<div
										style={{
											fontSize: 35,
											fontWeight: 800,
											letterSpacing: -1,
										}}
									>
										llink.space
									</div>
								</div>
							</div>

							<div
								style={{ display: "flex", flexDirection: "column", gap: 18 }}
							>
								<div
									style={{
										fontSize: 27,
										lineHeight: 1.42,
										color: palette.muted,
									}}
								>
									{subtitle}
								</div>

								<div
									style={{ display: "flex", flexDirection: "column", gap: 10 }}
								>
									{topLinks.length > 0 ? (
										topLinks.map((link, index) => (
											<div
												key={link.id}
												style={{
													display: "flex",
													alignItems: "center",
													gap: 12,
													borderRadius: 14,
													background: "rgba(255,255,255,0.08)",
													padding: "10px 14px",
												}}
											>
												<div
													style={{
														height: 24,
														width: 24,
														borderRadius: 9999,
														background: link.iconBgColor ?? palette.accent,
														border: "2px solid #11110F",
													}}
												/>
												<div
													style={{
														display: "flex",
														flexDirection: "column",
														gap: 1,
													}}
												>
													<div style={{ fontSize: 20, fontWeight: 700 }}>
														{trimText(link.title, 42)}
													</div>
													<div style={{ fontSize: 15, color: palette.muted }}>
														{toHostname(link.url)}
													</div>
												</div>
												<div
													style={{
														marginLeft: "auto",
														fontSize: 16,
														color: palette.muted,
													}}
												>
													#{index + 1}
												</div>
											</div>
										))
									) : (
										<div style={{ fontSize: 20, color: palette.muted }}>
											No public links yet.
										</div>
									)}
								</div>
							</div>
						</div>
					</div>,
					{
						width: OG_IMAGE_WIDTH,
						height: OG_IMAGE_HEIGHT,
						headers: buildOgHeaders(),
					},
				);
			},
		},
	},
});
