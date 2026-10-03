import { escapeBookmark } from "./bookmark-export";
import { normalizeHttpUrl } from "./security";
export function buildProfileBadge({
	url,
	label,
	appearance,
}: {
	url: string;
	label: string;
	appearance: "light" | "dark";
}) {
	const safe = normalizeHttpUrl(url);
	if (!safe) throw new Error("Use a valid page URL.");
	if (!label.trim() || label.trim().length > 60)
		throw new Error("Use a label between 1 and 60 characters.");
	const colors =
		appearance === "dark"
			? "background:#263b25;color:#fff;border:1px solid #263b25"
			: "background:#fff;color:#263b25;border:1px solid #dfe3da";
	return `<a href="${escapeBookmark(safe)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;padding:12px 18px;border-radius:12px;font:600 14px/1.4 sans-serif;text-decoration:none;${colors}">${escapeBookmark(label.trim())} <span aria-hidden="true">↗</span></a>`;
}
