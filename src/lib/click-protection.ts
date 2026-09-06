import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export const CLICK_LIMIT_PER_MINUTE = 60;
export const CLICK_DEDUP_SECONDS = 5;

export function isKnownCrawler(userAgent: string) {
	return /bot\b|crawler|spider|facebookexternalhit|slack-imgproxy|preview/i.test(
		userAgent,
	);
}

/** Only use a proxy header when the deployment explicitly trusts that proxy. */
export function clickClientKey(
	request: Request,
	secret: string,
	header?: string,
) {
	const candidate = header ? request.headers.get(header)?.trim() : undefined;
	const ip = candidate && isIP(candidate) ? candidate : "unknown";
	return hashClickKey(secret, ["client", ip]);
}

export function hashClickKey(secret: string, parts: string[]) {
	return createHmac("sha256", secret)
		.update(JSON.stringify(parts))
		.digest("hex");
}
