import { isLinkPublished } from "./link-publishing";
import { getTheme } from "./themes";
export function contrastRatio(a: string, b: string) {
	const lum = (hex: string) => {
		if (!/^#[\da-f]{6}$/i.test(hex)) return null;
		const [r, g, b] = [1, 3, 5].map((i) => {
			const c = parseInt(hex.slice(i, i + 2), 16) / 255;
			return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
		});
		return r * 0.2126 + g * 0.7152 + b * 0.0722;
	};
	const x = lum(a),
		y = lum(b);
	return x === null || y === null
		? null
		: (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function pageReadiness(
	profile: {
		displayName: string | null;
		bio: string | null;
		avatarUrl: string | null;
		theme: string | null;
		accentColor: string | null;
	},
	links: Array<{
		title: string;
		description: string | null;
		isActive: boolean | null;
		publishAt?: string | null;
		expireAt?: string | null;
	}>,
) {
	const theme = getTheme(profile.theme ?? "default"),
		live = links.filter((l) => isLinkPublished(l));
	const contrast = contrastRatio(theme.text, theme.cardBg),
		accent = contrastRatio(theme.text, profile.accentColor ?? theme.accent);
	return [
		{
			id: "name",
			ok: !!profile.displayName?.trim(),
			title: "Recognizable display name",
			detail: "Add the name visitors know you by.",
		},
		{
			id: "bio",
			ok: !!profile.bio?.trim(),
			title: "Introduce your page",
			detail: "Write a short bio that explains what visitors will find.",
		},
		{
			id: "avatar",
			ok: !!profile.avatarUrl,
			title: "Profile image",
			detail: "An avatar makes your page easier to recognize.",
		},
		{
			id: "live",
			ok: live.length > 0,
			title: "At least one live link",
			detail: "Publish a link that is inside its publishing window.",
		},
		{
			id: "titles",
			ok:
				live.length > 0 &&
				live.every(
					(l) => !/^(click here|link|website|untitled)$/i.test(l.title.trim()),
				),
			title: "Descriptive link titles",
			detail: "Use meaningful titles instead of “click here” or “link”.",
		},
		{
			id: "descriptions",
			ok: live.length > 0 && live.every((l) => !!l.description?.trim()),
			title: "Context for every live link",
			detail: "Short descriptions help visitors choose where to go.",
		},
		{
			id: "contrast",
			ok: contrast !== null && contrast >= 4.5,
			title: "Theme text contrast",
			detail: `Text against the card: ${contrast?.toFixed(2) ?? "unknown"}:1. Aim for at least 4.5:1.`,
		},
		{
			id: "accent",
			ok: accent !== null && accent >= 4.5,
			title: "Accent text contrast",
			detail: `Text against the accent: ${accent?.toFixed(2) ?? "unknown"}:1. Aim for at least 4.5:1.`,
		},
	];
}
