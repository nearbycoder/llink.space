import { normalizeHttpUrl } from "./security";

interface MarkdownLink {
	title: string;
	url: string;
	description: string | null;
	sectionId: string | null;
}
export function markdownText(text: string) {
	return text
		.replace(/[\r\n]+/g, " ")
		.replace(/[\\`*_{}[\]()#+.!|>~-]/g, "\\$&");
}
export function buildLinkMarkdown(
	links: MarkdownLink[],
	sections: Array<{ id: string; title: string }>,
) {
	const group = (items: MarkdownLink[]) =>
		items.flatMap((l) => {
			const url = normalizeHttpUrl(l.url);
			return url
				? [
						`- [${markdownText(l.title)}](<${url.replace(/[<>\\]/g, encodeURIComponent)}>)${l.description ? ` — ${markdownText(l.description)}` : ""}`,
					]
				: [];
		});
	const known = new Set(sections.map((s) => s.id));
	const rows = [
		"# My links",
		"",
		...group(links.filter((l) => !l.sectionId || !known.has(l.sectionId))),
	];
	for (const s of sections) {
		const items = group(links.filter((l) => l.sectionId === s.id));
		if (items.length)
			rows.push("", `## ${markdownText(s.title)}`, "", ...items);
	}
	return rows.join("\n") + "\n";
}
