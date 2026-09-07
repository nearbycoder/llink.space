import { normalizeHttpUrl } from "./security";
export function duplicateDestinations<T extends { id: string; url: string }>(
	links: T[],
) {
	const groups = new Map<string, T[]>();
	for (const link of links) {
		const safe = normalizeHttpUrl(link.url);
		if (!safe) continue;
		const url = new URL(safe);
		for (const key of [...url.searchParams.keys()])
			if (
				/^utm_/i.test(key) ||
				["gclid", "fbclid", "msclkid"].includes(key.toLowerCase())
			)
				url.searchParams.delete(key);
		url.searchParams.sort();
		const items = groups.get(url.href) ?? [];
		items.push(link);
		groups.set(url.href, items);
	}
	return [...groups]
		.filter(([, items]) => items.length > 1)
		.map(([url, links]) => ({ url, links }));
}
