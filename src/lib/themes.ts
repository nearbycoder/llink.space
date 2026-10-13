export interface Theme {
	id: string;
	name: string;
	background: string;
	cardBg: string;
	cardBorder: string;
	text: string;
	mutedText: string;
	accent: string;
}

export const themes: Record<string, Theme> = {
	default: {
		id: "default",
		name: "Signal",
		background:
			"radial-gradient(120% 70% at 0% 0%, #FFC4A3 0%, rgba(255,196,163,0) 60%), radial-gradient(110% 70% at 100% 100%, #C7D2FF 0%, rgba(199,210,255,0) 60%), #F5F3EE",
		cardBg: "#FFFFFF",
		cardBorder: "#16140F",
		text: "#16140F",
		mutedText: "#5F5A51",
		accent: "#FF5F1F",
	},
	dark: {
		id: "dark",
		name: "After Hours",
		background: "#121110",
		cardBg: "#1D1C19",
		cardBorder: "#8C877B",
		text: "#F5F3EE",
		mutedText: "#BAB4A7",
		accent: "#FF7A45",
	},
	slate: {
		id: "slate",
		name: "Paper & Ink",
		background: "#E9E6DD",
		cardBg: "#FBFAF6",
		cardBorder: "#16140F",
		text: "#16140F",
		mutedText: "#5B564C",
		accent: "#FFD5BF",
	},
	terracotta: {
		id: "terracotta",
		name: "Clay Studio",
		background: "#E2C0AA",
		cardBg: "#FFF6EC",
		cardBorder: "#6E3B26",
		text: "#47251A",
		mutedText: "#74503F",
		accent: "#F2B48A",
	},
	ocean: {
		id: "ocean",
		name: "Blue Hour",
		background: "#CCD8F2",
		cardBg: "#F7F9FF",
		cardBorder: "#1F3A73",
		text: "#14284F",
		mutedText: "#46577B",
		accent: "#B8CAFF",
	},
};

export function getTheme(id: string): Theme {
	return themes[id] ?? themes.default;
}
