import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { links } from "#/db/schema";
export function publishedLinkFilter() {
	const now = new Date().toISOString();
	return and(
		eq(links.isActive, true),
		or(isNull(links.publishAt), lte(links.publishAt, now)),
		or(isNull(links.expireAt), gt(links.expireAt, now)),
	);
}
