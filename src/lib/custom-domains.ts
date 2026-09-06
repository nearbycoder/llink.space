import { isIP } from "node:net";
import { domainToASCII } from "node:url";
export function normalizeCustomHostname(value: string, appHostname: string) {
	const trimmed = value.trim().toLowerCase().replace(/\.$/, "");
	if (/[/:@?#\\\s*]/.test(trimmed)) return null;
	const host = domainToASCII(trimmed);
	const labels = host.split(".");
	if (
		!host ||
		host.length > 253 ||
		labels.length < 2 ||
		isIP(host) ||
		!labels.every((l) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(l)) ||
		!/[a-z]/.test(labels.at(-1) ?? "")
	)
		return null;
	if (
		host === appHostname ||
		host.endsWith(`.${appHostname}`) ||
		/(^|\.)(localhost|local|internal|test|invalid|railway\.app)$/.test(host)
	)
		return null;
	return host;
}
export const domainProofHost = (hostname: string) => `_llink.${hostname}`;
export const domainProofValue = (token: string) =>
	`llink-verification=${token}`;
export function txtProvesOwnership(records: string[][], token: string) {
	return records.some((parts) => parts.join("") === domainProofValue(token));
}
