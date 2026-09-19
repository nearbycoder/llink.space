import { normalizeHttpUrl, prepareHttpUrl } from "./security";

/** Only known attribution parameters; destination parameters and fragments survive. */
export function cleanLinkUrl(value: string) {
	const safe = normalizeHttpUrl(prepareHttpUrl(value));
	if (!safe) return null;
	const url = new URL(safe);
	const removed = [...new Set(url.searchParams.keys())].filter(
		(key) =>
			/^utm_/i.test(key) ||
			["gclid", "fbclid", "msclkid"].includes(key.toLowerCase()),
	);
	for (const key of removed) url.searchParams.delete(key);
	return { url: url.href, removed };
}
