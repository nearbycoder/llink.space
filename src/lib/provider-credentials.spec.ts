import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptCredential, encryptCredential } from "./provider-credentials";

afterEach(() => vi.unstubAllEnvs());
describe("provider credentials", () => {
	it("encrypts with fresh IVs and binds ciphertext to its owner", () => {
		vi.stubEnv(
			"BETTER_AUTH_SECRET",
			"test-only-secret-that-is-at-least-32-characters",
		);
		const a = encryptCredential("test-provider-key", "creator-a"),
			b = encryptCredential("test-provider-key", "creator-a");
		expect(a).not.toContain("test-provider-key");
		expect(a).not.toBe(b);
		expect(decryptCredential(a, "creator-a")).toBe("test-provider-key");
		expect(() => decryptCredential(a, "creator-b")).toThrow();
		expect(() =>
			decryptCredential(`${a.slice(0, -3)}xxx`, "creator-a"),
		).toThrow();
	});
	it("requires a strong configured secret", () => {
		vi.stubEnv("BETTER_AUTH_SECRET", "short");
		expect(() => encryptCredential("key", "owner")).toThrow();
	});
});
