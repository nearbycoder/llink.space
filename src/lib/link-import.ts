import { normalizeHttpUrl, prepareHttpUrl } from "./security";

export const MAX_IMPORT_LINKS = 50;

/** URLs, spreadsheet rows, or Markdown link lists. */
export function parseLinkImport(text: string, existingUrls: string[] = []) {
	const seen = new Set(existingUrls.map((url) => normalizeHttpUrl(url) ?? url));
	const links: Array<{ title: string; url: string }> = [];
	const errors: Array<{ line: number; message: string }> = [];
	let duplicates = 0;
	text.split(/\r?\n/).forEach((line, index) => {
		if (!line.trim() || /^#{1,6}\s/.test(line.trim())) return;
		const markdown = line
			.trim()
			.match(
				/^(?:[-*+]\s+|\d+\.\s+)?\[((?:\\.|[^\]\\])*)\]\((?:<([^<>]+)>|([^\s]+))\)(?:\s+—.*)?$/,
			);
		const [rawUrl, ...titleParts] = markdown
			? [
					markdown[2] ?? markdown[3],
					markdown[1].replace(/\\([\\`*_{}[\]()#+.!|>~-])/g, "$1"),
				]
			: line.trim().split("\t");
		const url = normalizeHttpUrl(prepareHttpUrl(rawUrl));
		const title = titleParts.join(" ").trim();
		if (!url || url.length > 2048) {
			errors.push({
				line: index + 1,
				message: "Enter a valid website URL (up to 2,048 characters).",
			});
			return;
		}
		if (title.length > 100) {
			errors.push({
				line: index + 1,
				message: "Keep the title under 101 characters.",
			});
			return;
		}
		if (seen.has(url)) {
			duplicates += 1;
			return;
		}
		seen.add(url);
		links.push({
			title: title || new URL(url).hostname.replace(/^www\./, "").slice(0, 100),
			url,
		});
	});
	if (links.length > MAX_IMPORT_LINKS) {
		errors.push({
			line: 0,
			message: `Import up to ${MAX_IMPORT_LINKS} new links at a time.`,
		});
	}
	return { links, errors, duplicates };
}
