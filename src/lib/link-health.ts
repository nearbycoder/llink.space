import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";
import { normalizeHttpUrl } from "./security";

const blocked = new BlockList();
for (const [address, prefix] of [
	["0.0.0.0", 8],
	["10.0.0.0", 8],
	["100.64.0.0", 10],
	["127.0.0.0", 8],
	["169.254.0.0", 16],
	["172.16.0.0", 12],
	["192.0.0.0", 24],
	["192.0.2.0", 24],
	["192.168.0.0", 16],
	["198.18.0.0", 15],
	["198.51.100.0", 24],
	["203.0.113.0", 24],
	["224.0.0.0", 4],
	["240.0.0.0", 4],
] as const)
	blocked.addSubnet(address, prefix, "ipv4");
blocked.addAddress("168.63.129.16", "ipv4");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
const blockedV6 = new BlockList();
for (const [address, prefix] of [
	["2001::", 23],
	["2001:db8::", 32],
	["2002::", 16],
	["3fff::", 20],
] as const)
	blockedV6.addSubnet(address, prefix, "ipv6");
export function isPublicAddress(address: string) {
	const family = isIP(address);
	return family === 4
		? !blocked.check(address, "ipv4")
		: family === 6 &&
				globalV6.check(address, "ipv6") &&
				!blockedV6.check(address, "ipv6");
}
export interface PinnedTarget {
	url: URL;
	address: string;
	family: number;
}
interface ProbeResult {
	status: number;
	location?: string;
}
export async function resolvePublicTarget(
	value: string,
	resolve = () => Promise.resolve([] as { address: string; family: number }[]),
): Promise<PinnedTarget> {
	const normalized = normalizeHttpUrl(value);
	if (!normalized) throw new Error("blocked");
	const url = new URL(normalized),
		hostname = url.hostname.replace(/^\[|\]$/g, "");
	if (
		(url.port && !["80", "443"].includes(url.port)) ||
		/(^|\.)(localhost|local|internal|test|invalid)$/.test(hostname)
	)
		throw new Error("blocked");
	const addresses = isIP(hostname)
		? [{ address: hostname, family: isIP(hostname) }]
		: await resolve();
	if (!addresses.length) throw new Error("DNS lookup failed");
	if (addresses.some((a) => !isPublicAddress(a.address)))
		throw new Error("blocked");
	return { url, ...addresses[0] };
}
function probe(
	target: PinnedTarget,
	signal: AbortSignal,
): Promise<ProbeResult> {
	return new Promise((resolve, reject) => {
		const request = (
			target.url.protocol === "https:" ? httpsRequest : httpRequest
		)(
			target.url,
			{
				method: "HEAD",
				signal,
				agent: false,
				family: target.family,
				maxHeaderSize: 16384,
				lookup: (_host, _options, callback) =>
					callback(null, target.address, target.family),
				headers: {
					"user-agent": "llink.space Link Checker/1.0",
					accept: "*/*",
				},
			},
			(res) => {
				resolve({
					status: res.statusCode ?? 0,
					location: res.headers.location,
				});
				res.destroy();
			},
		);
		request.on("error", reject);
		request.end();
	});
}
export async function inspectLink(
	value: string,
	dependencies?: {
		resolve: (host: string) => Promise<{ address: string; family: number }[]>;
		probe: (target: PinnedTarget, signal: AbortSignal) => Promise<ProbeResult>;
	},
) {
	const signal = AbortSignal.timeout(8000);
	let current = value,
		redirects = 0;
	try {
		for (;;) {
			const hostname = new URL(current).hostname.replace(/^\[|\]$/g, "");
			const resolve = () =>
				dependencies
					? dependencies.resolve(hostname)
					: lookup(hostname, { all: true });
			const target = await Promise.race([
				resolvePublicTarget(current, resolve),
				new Promise<never>((_, reject) => {
					signal.addEventListener("abort", () => reject(new Error("timeout")), {
						once: true,
					});
				}),
			]);
			const response = await (dependencies?.probe ?? probe)(target, signal);
			if (
				[301, 302, 303, 307, 308].includes(response.status) &&
				response.location
			) {
				if (redirects >= 3)
					return {
						healthState: "redirect-loop",
						healthStatusCode: response.status,
						healthFinalUrl: current,
					};
				current = new URL(response.location, target.url).toString();
				redirects++;
				continue;
			}
			return {
				healthState:
					response.status >= 200 && response.status < 400
						? redirects
							? "redirected"
							: "healthy"
						: [401, 403, 405, 429].includes(response.status)
							? "restricted"
							: "broken",
				healthStatusCode: response.status,
				healthFinalUrl: current,
			};
		}
	} catch (error) {
		return {
			healthState:
				error instanceof Error && error.message === "blocked"
					? "blocked"
					: "unreachable",
			healthStatusCode: null,
			healthFinalUrl: null,
		};
	}
}
