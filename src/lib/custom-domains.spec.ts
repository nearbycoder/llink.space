import { describe, expect, it } from "vitest";
import { normalizeCustomHostname, txtProvesOwnership } from "./custom-domains";

describe("custom domain ownership", () => {
	it("normalizes public names and rejects reserved or ambiguous hosts", () => {
		expect(normalizeCustomHostname("Links.Creator.com.", "llink.space")).toBe(
			"links.creator.com",
		);
		for (const value of [
			"https://creator.com",
			"creator.com/path",
			"creator.com:443",
			"user@creator.com",
			"127.0.0.1",
			"*.creator.com",
			"llink.space",
			"api.llink.space",
			"private.internal",
			"hello.railway.app",
			"-bad.com",
		])
			expect(normalizeCustomHostname(value, "llink.space"), value).toBeNull();
	});
	it("requires the exact ownership value while joining TXT segments", () => {
		expect(
			txtProvesOwnership([["llink-verification=", "secret"]], "secret"),
		).toBe(true);
		expect(
			txtProvesOwnership([["llink-verification=secret-attacker"]], "secret"),
		).toBe(false);
		expect(txtProvesOwnership([["other=secret"]], "secret")).toBe(false);
	});
});
