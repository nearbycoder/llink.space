import { Resolver } from "node:dns/promises";
import { domainProofHost, txtProvesOwnership } from "./custom-domains";
export async function checkDomainOwnership(hostname: string, token: string) {
	try {
		const resolver = new Resolver({ timeout: 2500, tries: 1 });
		return txtProvesOwnership(
			await resolver.resolveTxt(domainProofHost(hostname)),
			token,
		);
	} catch {
		return false;
	}
}
