import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const DEFAULT_ICON_BG_COLOR = "#FFD9C7";

/** Ink or paper text, whichever reads best on a #RRGGBB background. */
export function readableTextColor(hexColor: string) {
	const normalized = hexColor.replace("#", "");
	if (!/^[0-9a-f]{6}$/i.test(normalized)) return "#16140F";
	const red = Number.parseInt(normalized.slice(0, 2), 16);
	const green = Number.parseInt(normalized.slice(2, 4), 16);
	const blue = Number.parseInt(normalized.slice(4, 6), 16);
	const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
	return luminance < 140 ? "#FAF8F3" : "#16140F";
}
