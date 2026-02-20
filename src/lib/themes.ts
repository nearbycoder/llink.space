export interface Theme {
	id: string
	name: string
	background: string
	cardBg: string
	cardBorder: string
	text: string
	mutedText: string
	accent: string
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
		name: "Kinetic Neon",
		background:
			"linear-gradient(128deg, #F5FF7B 0%, #8AE1E7 34%, #F2B7E2 68%, #FF8A4C 100%)",
		cardBg: "#FFFFFF",
		cardBorder: "#11110F",
		text: "#11110F",
		mutedText: "#4B4B45",
		accent: "#F5FF7B",
	},
	slate: {
		id: "slate",
		name: "Kinetic Neon",
		background:
			"linear-gradient(128deg, #F5FF7B 0%, #8AE1E7 34%, #F2B7E2 68%, #FF8A4C 100%)",
		cardBg: "#FFFFFF",
		cardBorder: "#11110F",
		text: "#11110F",
		mutedText: "#4B4B45",
		accent: "#F5FF7B",
	},
}

export function getTheme(id: string): Theme {
	return themes[id] ?? themes.default
}
