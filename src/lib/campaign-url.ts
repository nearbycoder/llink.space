import { normalizeHttpUrl, prepareHttpUrl } from "./security";
export const CAMPAIGN_FIELDS = [
	"source",
	"medium",
	"campaign",
	"term",
	"content",
] as const;
export type CampaignFields = Record<(typeof CAMPAIGN_FIELDS)[number], string>;
export function readCampaign(url: string): CampaignFields {
	let params = new URLSearchParams();
	try {
		params = new URL(prepareHttpUrl(url)).searchParams;
	} catch {
		/* Empty drafts are valid. */
	}
	return Object.fromEntries(
		CAMPAIGN_FIELDS.map((key) => [key, params.get(`utm_${key}`) ?? ""]),
	) as CampaignFields;
}
export function buildCampaignUrl(url: string, fields: CampaignFields) {
	const safe = normalizeHttpUrl(prepareHttpUrl(url));
	if (!safe) throw new Error("Enter a valid website URL first.");
	const result = new URL(safe);
	for (const key of CAMPAIGN_FIELDS) {
		const value = fields[key].trim();
		if (value.length > 200)
			throw new Error("Campaign values must be 200 characters or fewer.");
		if (value) result.searchParams.set(`utm_${key}`, value);
		else result.searchParams.delete(`utm_${key}`);
	}
	if (result.href.length > 2048)
		throw new Error("The finished URL exceeds 2,048 characters.");
	return result.href;
}
