import { z } from "zod";
import { LINK_ICON_KEYS } from "./link-icon-keys";
import { MAX_IMPORT_LINKS } from "./link-import";
import { normalizeHttpUrl } from "./security";

const catalogLinkSchema = z.object({
	title: z.string().trim().min(1).max(100),
	url: z
		.string()
		.max(2048)
		.transform((v, ctx) => {
			const url = normalizeHttpUrl(v);
			if (!url || url.length > 2048) {
				ctx.addIssue({ code: "custom", message: "Enter a valid website URL" });
				return z.NEVER;
			}
			return url;
		}),
	description: z.string().max(200).nullable().optional(),
	iconUrl: z.enum(LINK_ICON_KEYS).nullable().optional(),
	iconBgColor: z
		.string()
		.regex(/^#[\da-f]{6}$/i)
		.nullable()
		.optional(),
});
export function parseLinkCatalog(text: string, existingUrls: string[] = []) {
	if (new TextEncoder().encode(text).length > 256_000)
		throw new Error("Choose a JSON file smaller than 256 KB.");
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		throw new Error("This file is not valid JSON.");
	}
	const object = z.object({
		version: z.literal(1),
		links: z.array(catalogLinkSchema).max(MAX_IMPORT_LINKS),
	});
	const parsed = Array.isArray(value)
		? z.array(catalogLinkSchema).max(MAX_IMPORT_LINKS).safeParse(value)
		: object.safeParse(value);
	if (!parsed.success)
		throw new Error(
			`Use up to 50 links with valid titles, URLs, descriptions and icons. ${parsed.error.issues[0]?.message ?? ""}`,
		);
	const rows = Array.isArray(parsed.data) ? parsed.data : parsed.data.links;
	const seen = new Set(existingUrls.map((u) => normalizeHttpUrl(u) ?? u));
	let duplicates = 0;
	const links = rows.filter((row) => {
		if (seen.has(row.url)) {
			duplicates++;
			return false;
		}
		seen.add(row.url);
		return true;
	});
	return { links, duplicates };
}
export function buildLinkCatalog(
	links: Array<{
		title: string;
		url: string;
		description: string | null;
		iconUrl: string | null;
		iconBgColor: string | null;
		sectionId: string | null;
	}>,
	sections: Array<{ id: string; title: string }>,
) {
	const titles = new Map(sections.map((s) => [s.id, s.title]));
	return JSON.stringify(
		{
			version: 1,
			links: links.map((l) => ({
				title: l.title,
				url: l.url,
				description: l.description,
				iconUrl: l.iconUrl,
				iconBgColor: l.iconBgColor,
				section: l.sectionId ? (titles.get(l.sectionId) ?? null) : null,
			})),
		},
		null,
		2,
	);
}

/** Parse in a detached document: imported HTML is never inserted into the page. */
export function bookmarkLinksToText(source: string) {
	if (new TextEncoder().encode(source).length > 256_000)
		throw new Error("Choose a bookmark file smaller than 256 KB.");
	const doc = new DOMParser().parseFromString(source, "text/html");
	if (!/NETSCAPE-Bookmark-file-1/i.test(source) && !doc.querySelector("dl"))
		throw new Error("Choose a browser bookmark export in HTML format.");
	const anchors = [...doc.querySelectorAll("a[href]")];
	if (!anchors.length) throw new Error("This bookmark file has no links.");
	if (anchors.length > MAX_IMPORT_LINKS)
		throw new Error("Import up to 50 bookmarks at a time.");
	return anchors
		.map((a) => {
			const url = normalizeHttpUrl(a.getAttribute("href") ?? "");
			if (!url)
				throw new Error("Bookmarks must use http or https website URLs.");
			return `${url}\t${(a.textContent ?? "").replace(/[\t\r\n]+/g, " ").trim()}`;
		})
		.join("\n");
}
