import { createFileRoute } from "@tanstack/react-router";
import { ImageResponse } from "@vercel/og";
import {
	loadOgFonts,
	OG_CACHE_HEADERS,
	OG_HEIGHT,
	OG_INK,
	OG_LINE,
	OG_MUTED,
	OG_PAPER,
	OG_SIGNAL,
	OG_SIGNAL_STRONG,
	OG_WIDTH,
	OgWordmark,
} from "#/lib/og-brand.server";

const sampleLinks = [
	{
		title: "The spring collection",
		meta: "Objects made slowly",
		tone: "#FFD9C7",
	},
	{
		title: "Notes from the studio",
		meta: "Process and work in progress",
		tone: "#C7D2FF",
	},
	{ title: "Workshop tickets", meta: "Saturdays · 10am", tone: "#C9E4C5" },
];

const bars = [34, 48, 40, 58, 52, 84, 66];

async function handler() {
	const fonts = await loadOgFonts();
	return new ImageResponse(
		<div
			style={{
				display: "flex",
				position: "relative",
				width: "100%",
				height: "100%",
				background: OG_PAPER,
				fontFamily: "Geist",
				color: OG_INK,
				overflow: "hidden",
			}}
		>
			<div
				style={{
					display: "flex",
					position: "absolute",
					right: -120,
					top: -160,
					width: 760,
					height: 760,
					borderRadius: 9999,
					background:
						"radial-gradient(circle at 50% 50%, #FFC4A3 0%, rgba(255,196,163,0) 65%)",
				}}
			/>
			<div
				style={{
					display: "flex",
					position: "absolute",
					right: -60,
					bottom: -320,
					width: 680,
					height: 680,
					borderRadius: 9999,
					background:
						"radial-gradient(circle at 50% 50%, #C7D2FF 0%, rgba(199,210,255,0) 65%)",
				}}
			/>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
					width: 660,
					padding: "64px 0 60px 72px",
				}}
			>
				<OgWordmark size={44} />
				<div style={{ display: "flex", flexDirection: "column" }}>
					<div
						style={{
							fontFamily: "Fraunces",
							fontWeight: 600,
							fontSize: 74,
							lineHeight: 1,
							letterSpacing: "-0.045em",
						}}
					>
						Everything you make,
					</div>
					<div
						style={{
							fontFamily: "Fraunces",
							fontStyle: "italic",
							fontWeight: 500,
							fontSize: 74,
							lineHeight: 1.08,
							letterSpacing: "-0.045em",
							color: OG_SIGNAL_STRONG,
						}}
					>
						one link away.
					</div>
					<div
						style={{
							marginTop: 24,
							fontSize: 25,
							lineHeight: 1.4,
							color: OG_MUTED,
							maxWidth: 520,
						}}
					>
						A link-in-bio page that looks like you, with tools to organize it
						and insights that show what lands.
					</div>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: 14 }}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							flexShrink: 0,
							height: 56,
							padding: "0 26px",
							borderRadius: 999,
							background: OG_SIGNAL,
							fontSize: 22,
							fontWeight: 600,
							whiteSpace: "nowrap",
						}}
					>
						Create your page
					</div>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							height: 56,
							padding: "0 22px",
							borderRadius: 999,
							border: `1.5px solid ${OG_LINE}`,
							background: "#FFFFFF",
							fontFamily: "Geist Mono",
							fontSize: 20,
							color: OG_MUTED,
							whiteSpace: "nowrap",
						}}
					>
						llink.space/u/
						<span style={{ color: OG_INK }}>yourname</span>
					</div>
				</div>
			</div>

			<div
				style={{
					display: "flex",
					position: "absolute",
					right: 96,
					top: 64,
					width: 360,
					flexDirection: "column",
					alignItems: "center",
					padding: "34px 26px 30px",
					borderRadius: 40,
					background: "#FFFFFF",
					border: `1.5px solid ${OG_LINE}`,
					boxShadow: "0 40px 80px -30px rgba(22,20,15,0.45)",
					transform: "rotate(2.5deg)",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: 92,
						height: 92,
						borderRadius: 999,
						border: `5px solid #FFE6DA`,
						background: OG_SIGNAL,
						fontFamily: "Fraunces",
						fontWeight: 600,
						fontSize: 42,
					}}
				>
					S
				</div>
				<div
					style={{
						marginTop: 16,
						fontWeight: 600,
						fontSize: 30,
						letterSpacing: "-0.02em",
					}}
				>
					Studio Field
				</div>
				<div
					style={{
						fontFamily: "Geist Mono",
						fontSize: 17,
						color: OG_MUTED,
					}}
				>
					@studiofield
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 12,
						width: "100%",
						marginTop: 24,
					}}
				>
					{sampleLinks.map((link) => (
						<div
							key={link.title}
							style={{
								display: "flex",
								alignItems: "center",
								gap: 14,
								padding: "13px 14px",
								borderRadius: 20,
								border: `1.5px solid ${OG_LINE}`,
							}}
						>
							<div
								style={{
									display: "flex",
									width: 40,
									height: 40,
									borderRadius: 12,
									background: link.tone,
								}}
							/>
							<div style={{ display: "flex", flexDirection: "column" }}>
								<div style={{ fontSize: 19, fontWeight: 600 }}>
									{link.title}
								</div>
								<div style={{ fontSize: 15, color: OG_MUTED }}>{link.meta}</div>
							</div>
						</div>
					))}
				</div>
			</div>

			<div
				style={{
					display: "flex",
					position: "absolute",
					right: 44,
					bottom: 40,
					flexDirection: "column",
					width: 236,
					padding: "18px 20px",
					borderRadius: 26,
					background: OG_INK,
					color: "#FAF8F3",
					boxShadow: "0 30px 60px -24px rgba(22,20,15,0.6)",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						fontSize: 15,
						color: "rgba(250,248,243,0.65)",
					}}
				>
					<span>Clicks this week</span>
					<span style={{ color: OG_SIGNAL }}>+38%</span>
				</div>
				<div
					style={{
						fontWeight: 600,
						fontSize: 38,
						letterSpacing: "-0.02em",
						margin: "2px 0 12px",
					}}
				>
					1,284
				</div>
				<div
					style={{
						display: "flex",
						alignItems: "flex-end",
						gap: 7,
						height: 44,
					}}
				>
					{bars.map((height, index) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: static decorative bars
							key={index}
							style={{
								display: "flex",
								flex: 1,
								height: `${height}%`,
								borderRadius: 4,
								background:
									height === 84 ? OG_SIGNAL : "rgba(250,248,243,0.18)",
							}}
						/>
					))}
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

export const Route = createFileRoute("/api/og")({
	server: {
		handlers: {
			GET: handler,
		},
	},
});
