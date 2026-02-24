export const PROFILE_BACKGROUND_TYPES = ["color", "gradient", "image"] as const;

export type ProfileBackgroundType = (typeof PROFILE_BACKGROUND_TYPES)[number];

export const DEFAULT_PROFILE_BACKGROUND_TYPE: ProfileBackgroundType =
	"gradient";
export const DEFAULT_PROFILE_BACKGROUND_COLOR_ID = "sun-cream";
export const DEFAULT_PROFILE_BACKGROUND_GRADIENT_ID = "kinetic-neon";

export const PROFILE_BACKGROUND_COLOR_OPTIONS = [
	{ id: "sun-cream", label: "Sun Cream", value: "#FFF6D6" },
	{ id: "paper-white", label: "Paper White", value: "#FDFCF8" },
	{ id: "mint-pop", label: "Mint Pop", value: "#DDF8E8" },
	{ id: "sky-note", label: "Sky Note", value: "#DDEFFF" },
	{ id: "peach-glow", label: "Peach Glow", value: "#FFE3D2" },
	{ id: "rose-fog", label: "Rose Fog", value: "#FADFF0" },
	{ id: "ink-night", label: "Ink Night", value: "#1C1B25" },
	{ id: "forest-deep", label: "Forest Deep", value: "#1C2B2A" },
] as const;

export const PROFILE_BACKGROUND_GRADIENT_OPTIONS = [
	{
		id: "kinetic-neon",
		label: "Kinetic Neon",
		value:
			"linear-gradient(128deg, #F5FF7B 0%, #8AE1E7 34%, #F2B7E2 68%, #FF8A4C 100%)",
	},
	{
		id: "dawn-sky",
		label: "Dawn Sky",
		value: "linear-gradient(140deg, #FEE7C8 0%, #F7B7D7 42%, #8FCBFF 100%)",
	},
	{
		id: "mint-sunrise",
		label: "Mint Sunrise",
		value: "linear-gradient(140deg, #D8FBE5 0%, #FFF1AE 45%, #FFD4B8 100%)",
	},
	{
		id: "retro-pop",
		label: "Retro Pop",
		value:
			"linear-gradient(135deg, #F8FF75 0%, #FDC15C 33%, #F5788E 66%, #71D7F7 100%)",
	},
	{
		id: "twilight-wave",
		label: "Twilight Wave",
		value: "linear-gradient(150deg, #1F1C3C 0%, #5E3A87 48%, #D77DBE 100%)",
	},
] as const;

const colorValueById = new Map(
	PROFILE_BACKGROUND_COLOR_OPTIONS.map((option) => [option.id, option.value]),
);

const gradientValueById = new Map(
	PROFILE_BACKGROUND_GRADIENT_OPTIONS.map((option) => [
		option.id,
		option.value,
	]),
);

const backgroundTypeSet = new Set<string>(PROFILE_BACKGROUND_TYPES);

export function isProfileBackgroundType(
	value: string,
): value is ProfileBackgroundType {
	return backgroundTypeSet.has(value);
}

export function isProfileBackgroundColorId(value: string): boolean {
	return colorValueById.has(value);
}

export function isProfileBackgroundGradientId(value: string): boolean {
	return gradientValueById.has(value);
}

export function getProfileBackgroundColorValue(
	colorId: string | null | undefined,
): string {
	return (
		(colorId && colorValueById.get(colorId)) ??
		colorValueById.get(DEFAULT_PROFILE_BACKGROUND_COLOR_ID) ??
		"#FFF6D6"
	);
}

export function getProfileBackgroundGradientValue(
	gradientId: string | null | undefined,
): string {
	return (
		(gradientId && gradientValueById.get(gradientId)) ??
		gradientValueById.get(DEFAULT_PROFILE_BACKGROUND_GRADIENT_ID) ??
		"linear-gradient(128deg, #F5FF7B 0%, #8AE1E7 34%, #F2B7E2 68%, #FF8A4C 100%)"
	);
}
