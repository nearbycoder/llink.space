/** Read a standard comma-separated file without evaluating spreadsheet formulas. */
export function csvLinksToText(source: string): string {
	if (source.length > 256_000)
		throw new Error("Choose a CSV smaller than 256 KB.");
	const rows: string[][] = [];
	let row: string[] = [],
		cell = "",
		quoted = false;
	for (let i = 0; i < source.length; i++) {
		const char = source[i];
		if (char === '"') {
			if (quoted && source[i + 1] === '"') {
				cell += '"';
				i++;
			} else if (quoted || !cell) quoted = !quoted;
			else throw new Error("This CSV contains an unexpected quote.");
		} else if (!quoted && (char === "," || char === "\n")) {
			row.push(cell.replace(/\r$/, ""));
			cell = "";
			if (char === "\n") {
				rows.push(row);
				row = [];
			}
		} else cell += char;
	}
	if (quoted) throw new Error("This CSV has an unclosed quote.");
	row.push(cell.replace(/\r$/, ""));
	if (row.some((c) => c.trim())) rows.push(row);
	const headers =
		rows.shift()?.map((c) =>
			c
				.trim()
				.replace(/^\uFEFF/, "")
				.toLowerCase(),
		) ?? [];
	const url = headers.indexOf("url"),
		title = headers.indexOf("title");
	if (url < 0)
		throw new Error(
			"Include a URL column in the CSV header. Title is optional.",
		);
	const entries = rows.filter((r) => r.some((c) => c.trim()));
	if (entries.length > 50)
		throw new Error("Import up to 50 CSV rows at a time.");
	return entries
		.map((r) => {
			const address = (r[url] ?? "").trim();
			if (!address || /[\r\n\t]/.test(address))
				throw new Error("Each row needs a single URL.");
			return `${address}\t${(r[title] ?? "").replace(/[\r\n\t]+/g, " ").trim()}`;
		})
		.join("\n");
}
