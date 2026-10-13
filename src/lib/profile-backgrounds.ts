export const PROFILE_BACKGROUND_TYPES = [
	"color",
	"gradient",
	"image",
	"theme",
] as const;

export type ProfileBackgroundType = (typeof PROFILE_BACKGROUND_TYPES)[number];

export const DEFAULT_PROFILE_BACKGROUND_TYPE: ProfileBackgroundType =
	"gradient";
export const DEFAULT_PROFILE_BACKGROUND_COLOR_ID = "sun-cream";
export const DEFAULT_PROFILE_BACKGROUND_GRADIENT_ID = "kinetic-neon";

export const PROFILE_BACKGROUND_COLOR_OPTIONS = [
	{ id: "sun-cream", label: "Sun Cream", value: "#FBF1DA" },
	{ id: "paper-white", label: "Paper", value: "#F5F3EE" },
	{ id: "mint-pop", label: "Sage", value: "#DCE8DA" },
	{ id: "sky-note", label: "Sky", value: "#DCE5F7" },
	{ id: "peach-glow", label: "Peach", value: "#FFE2D2" },
	{ id: "rose-fog", label: "Rose", value: "#F5DFE6" },
	{ id: "ink-night", label: "Ink", value: "#16140F" },
	{ id: "forest-deep", label: "Forest", value: "#1B2B25" },
] as const;

export const PROFILE_BACKGROUND_GRADIENT_OPTIONS = [
	{
		id: "kinetic-neon",
		label: "Signal Glow",
		value:
			"radial-gradient(120% 70% at 0% 0%, #FFC4A3 0%, rgba(255,196,163,0) 60%), radial-gradient(110% 70% at 100% 100%, #C7D2FF 0%, rgba(199,210,255,0) 60%), #F5F3EE",
	},
	{
		id: "dawn-sky",
		label: "Dawn",
		value: "linear-gradient(160deg, #FDE3CF 0%, #F6CDD8 45%, #CCD9F8 100%)",
	},
	{
		id: "mint-sunrise",
		label: "Meadow",
		value: "linear-gradient(160deg, #E3EEDC 0%, #F6EFD2 50%, #F9D9C4 100%)",
	},
	{
		id: "retro-pop",
		label: "Citrus",
		value:
			"linear-gradient(135deg, #FFE27A 0%, #FFAE6B 40%, #FF7E6B 70%, #F6B6C8 100%)",
	},
	{
		id: "twilight-wave",
		label: "Nightfall",
		value: "linear-gradient(160deg, #16140F 0%, #2A2140 55%, #6B3A3A 100%)",
	},
] as const;

export type ProfileBackgroundColorId =
	(typeof PROFILE_BACKGROUND_COLOR_OPTIONS)[number]["id"];
export type ProfileBackgroundGradientId =
	(typeof PROFILE_BACKGROUND_GRADIENT_OPTIONS)[number]["id"];

const colorValueById = new Map<string, string>(
	PROFILE_BACKGROUND_COLOR_OPTIONS.map((option) => [option.id, option.value]),
);

const gradientValueById = new Map<string, string>(
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

export function isProfileBackgroundColorId(
	value: string,
): value is ProfileBackgroundColorId {
	return colorValueById.has(value);
}

export function isProfileBackgroundGradientId(
	value: string,
): value is ProfileBackgroundGradientId {
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
