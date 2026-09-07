import { normalizeHttpUrl } from "./security";

function vcardText(value: string) {
	return value
		.replace(/\\/g, "\\\\")
		.replace(/\r?\n/g, "\\n")
		.replace(/\r/g, "")
		.replace(/[,;]/g, "\\$&");
}
function foldCard(line: string) {
	const encoder = new TextEncoder();
	let part = "",
		size = 0;
	const lines = [];
	for (const c of line) {
		const bytes = encoder.encode(c).length;
		if (size + bytes > 75) {
			lines.push(part);
			part = " ";
			size = 1;
		}
		part += c;
		size += bytes;
	}
	lines.push(part);
	return lines.join("\r\n");
}
export function buildVcard({
	name,
	bio,
	url,
}: {
	name: string;
	bio?: string | null;
	url: string;
}) {
	const safe = normalizeHttpUrl(url);
	if (!safe) throw new Error("Invalid profile URL");
	return `${["BEGIN:VCARD", "VERSION:3.0", `FN:${vcardText(name)}`, `N:;${vcardText(name)};;;`, `URL:${safe}`, ...(bio ? [`NOTE:${vcardText(bio)}`] : []), "END:VCARD"].map(foldCard).join("\r\n")}\r\n`;
}
