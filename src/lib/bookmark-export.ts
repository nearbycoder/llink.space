import { normalizeHttpUrl } from "./security";
export interface BookmarkLink {
	title: string;
	url: string;
	description: string | null;
	sectionId: string | null;
}
export function escapeBookmark(value: string) {
	return value.replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			]!,
	);
}
export function buildBookmarks(
	links: BookmarkLink[],
	sections: Array<{ id: string; title: string }>,
) {
	const rows = [
		"<!DOCTYPE NETSCAPE-Bookmark-file-1>",
		'<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
		"<TITLE>llink.space bookmarks</TITLE>",
		"<H1>llink.space bookmarks</H1>",
		"<DL><p>",
	];
	const group = (items: BookmarkLink[]) =>
		items.flatMap((link) => {
			const url = normalizeHttpUrl(link.url);
			return url
				? [
						`<DT><A HREF="${escapeBookmark(url)}">${escapeBookmark(link.title)}</A>`,
						...(link.description
							? [`<DD>${escapeBookmark(link.description)}`]
							: []),
					]
				: [];
		});
	const known = new Set(sections.map((s) => s.id));
	rows.push(
		...group(links.filter((l) => !l.sectionId || !known.has(l.sectionId))),
	);
	for (const section of sections) {
		const items = group(links.filter((l) => l.sectionId === section.id));
		if (items.length)
			rows.push(
				`<DT><H3>${escapeBookmark(section.title)}</H3>`,
				"<DL><p>",
				...items,
				"</DL><p>",
			);
	}
	rows.push("</DL><p>");
	return rows.join("\n");
}
