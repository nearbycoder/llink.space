import { createFileRoute } from "@tanstack/react-router";
import { ImageResponse } from "@vercel/og";
import { BarChart3, Link2, type LucideIcon, Sparkles } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

const WIDTH = 1200;
const HEIGHT = 630;
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

async function handler() {
	const brandGlyph = getLucideIconDataUri(Link2, "brand-link", 36, "#F5F3CF");
	const sparklesGlyph = getLucideIconDataUri(
		Sparkles,
		"hero-sparkles",
		20,
		"#11110F",
	);
	const chartGlyph = getLucideIconDataUri(
		BarChart3,
		"hero-chart",
		20,
		"#11110F",
	);

	return new ImageResponse(
		<div
			style={{
				display: "flex",
				position: "relative",
				width: "100%",
				height: "100%",
				alignItems: "center",
				justifyContent: "center",
				background:
					"linear-gradient(128deg, #F5FF7B 0%, #8AE1E7 34%, #F2B7E2 68%, #FF8A4C 100%)",
				fontFamily: "Arial, sans-serif",
			}}
		>
			<div
				style={{
					display: "flex",
					position: "absolute",
					top: -120,
					left: -90,
					width: 320,
					height: 320,
					borderRadius: 9999,
					background: "rgba(17,17,15,0.14)",
				}}
			/>
			<div
				style={{
					display: "flex",
					position: "absolute",
					bottom: -100,
					right: -40,
					width: 260,
					height: 260,
					borderRadius: 9999,
					background: "rgba(255,252,239,0.4)",
				}}
			/>

			<div
				style={{
					display: "flex",
					width: 1080,
					height: 520,
					padding: "36px 38px",
					gap: 28,
					borderRadius: 44,
					border: "4px solid #11110F",
					background: "#FFFCEF",
					boxShadow: "12px 12px 0 #11110F",
					transform: "rotate(-0.4deg)",
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						width: 640,
						justifyContent: "space-between",
						color: "#11110F",
					}}
				>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 16,
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
							<div
								style={{
									display: "flex",
									width: 54,
									height: 54,
									borderRadius: 16,
									padding: 3,
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
										borderRadius: 12,
										alignItems: "center",
										justifyContent: "center",
										background: "#11110F",
									}}
								>
									<img
										src={brandGlyph}
										alt=""
										aria-hidden="true"
										width={36}
										height={36}
										style={{ width: 36, height: 36 }}
									/>
								</div>
							</div>
							<div
								style={{
									fontSize: 48,
									fontWeight: 900,
									fontFamily: "'Arial Black', Arial, sans-serif",
									lineHeight: 1,
								}}
							>
								llink.space
							</div>
						</div>

						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 8,
							}}
						>
							<div
								style={{
									fontSize: 74,
									fontWeight: 900,
									fontFamily: "'Arial Black', Arial, sans-serif",
									lineHeight: 0.98,
								}}
							>
								YOUR LINK-IN-BIO
							</div>
							<div
								style={{
									fontSize: 74,
									fontWeight: 900,
									fontFamily: "'Arial Black', Arial, sans-serif",
									lineHeight: 0.98,
								}}
							>
								HOME BASE.
							</div>
							<div
								style={{
									fontSize: 30,
									lineHeight: 1.25,
									color: "#4B4A43",
								}}
							>
								Build one branded page, share it everywhere, and track what
								drives clicks.
							</div>
						</div>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
						<div
							style={{
								display: "flex",
								height: 54,
								padding: "0 20px",
								alignItems: "center",
								borderRadius: 9999,
								border: "3px solid #11110F",
								background: "#11110F",
								color: "#F5FF7B",
								fontSize: 26,
								fontWeight: 700,
							}}
						>
							Create your page
						</div>
						<div
							style={{
								display: "flex",
								height: 54,
								padding: "0 20px",
								alignItems: "center",
								borderRadius: 9999,
								border: "3px solid #11110F",
								background: "#FFFFFF",
								fontSize: 26,
								fontWeight: 700,
							}}
						>
							llink.space/u/yourname
						</div>
					</div>
				</div>

				<div
					style={{
						display: "flex",
						flexDirection: "column",
						width: 336,
						gap: 16,
					}}
				>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 10,
							padding: 18,
							borderRadius: 28,
							border: "4px solid #11110F",
							background: "#FFFFFF",
							boxShadow: "8px 8px 0 #11110F",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								fontSize: 20,
								fontWeight: 700,
							}}
						>
							<div>@daily.designs</div>
							<img
								src={sparklesGlyph}
								alt=""
								aria-hidden="true"
								width={20}
								height={20}
								style={{ width: 20, height: 20 }}
							/>
						</div>

						{["New release", "Resources", "Community"].map((item) => (
							<div
								key={item}
								style={{
									display: "flex",
									height: 52,
									alignItems: "center",
									justifyContent: "space-between",
									padding: "0 14px",
									borderRadius: 14,
									border: "3px solid #11110F",
									background: "#F8F8F4",
									fontSize: 22,
									fontWeight: 600,
								}}
							>
								<div>{item}</div>
								<div>+</div>
							</div>
						))}
					</div>

					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 8,
							padding: "16px 18px",
							borderRadius: 24,
							border: "4px solid #11110F",
							background: "#11110F",
							color: "#E0FAFC",
							boxShadow: "8px 8px 0 #11110F",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 8,
								fontSize: 20,
								fontWeight: 600,
							}}
						>
							<img
								src={chartGlyph}
								alt=""
								aria-hidden="true"
								width={20}
								height={20}
								style={{ width: 20, height: 20 }}
							/>
							<div>Performance</div>
						</div>
						<div
							style={{
								fontSize: 42,
								lineHeight: 1,
								fontWeight: 800,
							}}
						>
							+312 total clicks
						</div>
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
}

export const Route = createFileRoute("/api/og")({
	server: {
		handlers: {
			GET: handler,
		},
	},
});
