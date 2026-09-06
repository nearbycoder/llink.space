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
		name: "Kinetic Neon",
		background:
			"linear-gradient(128deg, #F5FF7B 0%, #8AE1E7 34%, #F2B7E2 68%, #FF8A4C 100%)",
		cardBg: "#FFFFFF",
		cardBorder: "#11110F",
		text: "#11110F",
		mutedText: "#4B4B45",
		accent: "#F5FF7B",
	},
	dark: {
		id: "dark",
		name: "After Hours",
		background: "#181923",
		cardBg: "#292B39",
		cardBorder: "#797C91",
		text: "#F6F1E8",
		mutedText: "#C6C5D1",
		accent: "#EBD999",
	},
	slate: {
		id: "slate",
		name: "Paper & Ink",
		background: "#E7E4DA",
		cardBg: "#FFFCF5",
		cardBorder: "#30372E",
		text: "#252E25",
		mutedText: "#596052",
		accent: "#D4E0BC",
	},
	terracotta: {
		id: "terracotta",
		name: "Clay Studio",
		background: "#DEBDA8",
		cardBg: "#FFF3E5",
		cardBorder: "#70422E",
		text: "#4C2C20",
		mutedText: "#765445",
		accent: "#EDC599",
	},
	ocean: {
		id: "ocean",
		name: "Blue Hour",
		background: "#C9E8EB",
		cardBg: "#F2FFFF",
		cardBorder: "#285461",
		text: "#153E4D",
		mutedText: "#436A76",
		accent: "#A8DCD4",
	},
};

export function getTheme(id: string): Theme {
	return themes[id] ?? themes.default;
}
