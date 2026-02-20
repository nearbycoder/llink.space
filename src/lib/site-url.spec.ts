import { afterEach, describe, expect, it, vi } from "vitest";
import {
	getConfiguredSiteOrigin,
	resolveSiteOrigin,
	toAbsoluteUrl,
} from "#/lib/site-url";

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("site-url", () => {
	it("uses configured origin priority and normalizes host values", () => {
		vi.stubEnv("PUBLIC_URL", "");
		vi.stubEnv("APP_URL", "app.llink.space");
		vi.stubEnv("BETTER_AUTH_URL", "https://auth.llink.space/path");
		vi.stubEnv("VITE_SITE_URL", "https://site.llink.space");
		vi.stubEnv("VITE_URL", "https://vite.llink.space");

		expect(getConfiguredSiteOrigin()).toBe("https://app.llink.space");
	});

	it("falls back to default site when no valid env origin is configured", () => {
		vi.stubEnv("PUBLIC_URL", "");
		vi.stubEnv("APP_URL", "");
		vi.stubEnv("BETTER_AUTH_URL", "");
		vi.stubEnv("VITE_SITE_URL", "");
		vi.stubEnv("VITE_URL", "");

		expect(getConfiguredSiteOrigin()).toBe("https://llink.space");
	});

	it("prefers request origin when request URL is valid", () => {
		const request = new Request("https://preview.llink.space/dashboard");
		expect(resolveSiteOrigin(request)).toBe("https://preview.llink.space");
	});

	it("falls back to configured origin when request URL is malformed", () => {
		vi.stubEnv("APP_URL", "https://app.llink.space");
		const malformedRequest = { url: "not a url" } as Request;

		expect(resolveSiteOrigin(malformedRequest)).toBe("https://app.llink.space");
	});

	it("returns unchanged absolute URLs", () => {
		expect(toAbsoluteUrl("https://docs.llink.space/guide")).toBe(
			"https://docs.llink.space/guide",
		);
	});

	it("builds absolute URLs for relative paths", () => {
		expect(toAbsoluteUrl("dashboard", "https://llink.space")).toBe(
			"https://llink.space/dashboard",
		);
		expect(toAbsoluteUrl("/u/test", "https://llink.space")).toBe(
			"https://llink.space/u/test",
		);
	});

	it("returns origin when path input is empty", () => {
		expect(toAbsoluteUrl("", "https://llink.space")).toBe("https://llink.space");
	});
});
