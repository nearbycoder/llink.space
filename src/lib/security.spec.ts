import { afterEach, describe, expect, it, vi } from "vitest";
import {
	isAllowedAvatarUrl,
	isAllowedBackgroundImageUrl,
	isTrustedRequestOrigin,
	normalizeHttpUrl,
	prepareHttpUrl,
	resolveTrustedOrigins,
} from "#/lib/security";

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("security", () => {
	describe("normalizeHttpUrl", () => {
		it("normalizes valid http/https URLs", () => {
			expect(normalizeHttpUrl(" https://llink.space/path ")).toBe(
				"https://llink.space/path",
			);
		});

		it("rejects non-http protocols", () => {
			expect(normalizeHttpUrl("ftp://llink.space/file.txt")).toBeNull();
		});

		it("rejects credentials in URL", () => {
			expect(normalizeHttpUrl("https://user:pass@llink.space")).toBeNull();
		});
	});

	describe("prepareHttpUrl", () => {
		it("adds HTTPS to plain domains and protocol-relative URLs", () => {
			expect(prepareHttpUrl(" example.com/path ")).toBe(
				"https://example.com/path",
			);
			expect(prepareHttpUrl("//example.com/path")).toBe(
				"https://example.com/path",
			);
		});

		it("does not disguise explicit unsafe schemes", () => {
			expect(prepareHttpUrl("javascript:alert(1)")).toBe("javascript:alert(1)");
		});
	});

	describe("isAllowedAvatarUrl", () => {
		it("allows local upload paths except svg", () => {
			expect(isAllowedAvatarUrl("/uploads/avatar.png")).toBe(true);
			expect(isAllowedAvatarUrl("/api/storage/profile.webp")).toBe(true);
			expect(isAllowedAvatarUrl("/uploads/logo.svg")).toBe(false);
		});

		it("rejects SVG query/fragment bypasses and local path escapes", () => {
			for (const value of [
				"/uploads/logo.svg?size=64",
				"/api/storage/logo.SVG#image",
				"/uploads/%6cogo%2esvg",
				"/uploads/../api/auth/sign-out",
				"/api/storage/%2e%2e/other",
				"/uploads/%zz",
			]) {
				expect(isAllowedAvatarUrl(value), value).toBe(false);
			}
			expect(isAllowedAvatarUrl("/uploads/avatar.png?size=64")).toBe(true);
		});

		it("allows safe http avatar URLs and blocks svg URLs", () => {
			expect(isAllowedAvatarUrl("https://cdn.llink.space/avatar.jpg")).toBe(
				true,
			);
			expect(
				isAllowedAvatarUrl("https://cdn.llink.space/avatar.svg?size=64"),
			).toBe(false);
		});
	});

	describe("isAllowedBackgroundImageUrl", () => {
		it("matches avatar image URL safety rules", () => {
			expect(isAllowedBackgroundImageUrl("/uploads/background.png")).toBe(true);
			expect(isAllowedBackgroundImageUrl("/uploads/background.svg")).toBe(
				false,
			);
			expect(
				isAllowedBackgroundImageUrl("https://cdn.llink.space/bg.webp"),
			).toBe(true);
			expect(
				isAllowedBackgroundImageUrl("https://cdn.llink.space/bg.svg"),
			).toBe(false);
		});
	});

	describe("resolveTrustedOrigins", () => {
		it("does not trust opaque configured origins or unconfigured auth hosts", () => {
			vi.stubEnv(
				"BETTER_AUTH_TRUSTED_ORIGINS",
				"data:text/plain,https://login.example",
			);
			expect(resolveTrustedOrigins()).not.toContain("null");
			expect(resolveTrustedOrigins()).not.toContain(
				"https://untrusted.example",
			);
			expect(resolveTrustedOrigins()).toContain("https://login.example");
		});
		it("includes request origin and valid configured origins", () => {
			vi.stubEnv("BETTER_AUTH_URL", "https://auth.llink.space/auth");
			vi.stubEnv("APP_URL", "https://app.llink.space");
			vi.stubEnv("PUBLIC_URL", "invalid");
			vi.stubEnv(
				"BETTER_AUTH_TRUSTED_ORIGINS",
				"https://admin.llink.space, https://api.llink.space ,not-a-url",
			);

			const request = new Request("https://preview.llink.space/dashboard");
			const trusted = resolveTrustedOrigins(request);

			expect(trusted).toEqual(
				expect.arrayContaining([
					"https://preview.llink.space",
					"https://auth.llink.space",
					"https://app.llink.space",
					"https://admin.llink.space",
					"https://api.llink.space",
				]),
			);
			expect(trusted).not.toContain("invalid");
		});
	});

	describe("isTrustedRequestOrigin", () => {
		it("accepts matching origin header", () => {
			const request = new Request(
				"https://app.llink.space/api/trpc/links.create",
				{
					headers: {
						origin: "https://app.llink.space",
					},
				},
			);

			expect(isTrustedRequestOrigin(request)).toBe(true);
		});

		it("rejects mismatched origin header", () => {
			const request = new Request(
				"https://app.llink.space/api/trpc/links.create",
				{
					headers: {
						origin: "https://evil.example",
					},
				},
			);

			expect(isTrustedRequestOrigin(request)).toBe(false);
		});

		it("uses referer when origin is missing", () => {
			vi.stubEnv("BETTER_AUTH_TRUSTED_ORIGINS", "https://app.llink.space");
			const request = new Request("https://api.llink.space/api/upload/avatar", {
				headers: {
					referer: "https://app.llink.space/dashboard",
				},
			});

			expect(isTrustedRequestOrigin(request)).toBe(true);
		});

		it("rejects malformed referer when origin is missing", () => {
			const request = new Request("https://app.llink.space/api/upload/avatar", {
				headers: {
					referer: "malformed",
				},
			});

			expect(isTrustedRequestOrigin(request)).toBe(false);
		});

		it("rejects cross-site fetch metadata without origin", () => {
			const request = new Request("https://app.llink.space/api/upload/avatar", {
				headers: {
					"sec-fetch-site": "cross-site",
				},
			});

			expect(isTrustedRequestOrigin(request)).toBe(false);
		});

		it("rejects same-site sibling requests without an explicit trusted origin", () => {
			expect(
				isTrustedRequestOrigin(
					new Request("https://app.llink.space/api/upload/avatar", {
						headers: { "sec-fetch-site": "same-site" },
					}),
				),
			).toBe(false);
		});

		it("allows requests that omit browser origin metadata", () => {
			const request = new Request("https://app.llink.space/api/upload/avatar");

			expect(isTrustedRequestOrigin(request)).toBe(true);
		});
	});
});
