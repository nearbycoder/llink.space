import { describe, expect, it } from "vitest";
import {
	clickClientKey,
	hashClickKey,
	isKnownCrawler,
} from "./click-protection";

describe("click protection identity", () => {
	it("ignores spoofable headers unless a trusted proxy is configured", () => {
		const request = new Request("https://llink.space", {
			headers: { "x-real-ip": "192.0.2.1", "x-forwarded-for": "192.0.2.2" },
		});
		const other = new Request("https://llink.space", {
			headers: { "x-real-ip": "192.0.2.3" },
		});
		expect(clickClientKey(request, "secret")).toBe(
			clickClientKey(other, "secret"),
		);
		expect(clickClientKey(request, "secret", "x-real-ip")).not.toBe(
			clickClientKey(other, "secret", "x-real-ip"),
		);
	});
	it("uses an anonymous fallback for invalid addresses and stores only HMAC keys", () => {
		const request = new Request("https://llink.space", {
			headers: { "x-real-ip": "spoof, 192.0.2.1" },
		});
		expect(clickClientKey(request, "secret", "x-real-ip")).toBe(
			clickClientKey(request, "secret"),
		);
		expect(hashClickKey("secret", ["192.0.2.1"])).toMatch(/^[0-9a-f]{64}$/);
		expect(hashClickKey("secret", ["192.0.2.1"])).not.toBe(
			hashClickKey("other secret", ["192.0.2.1"]),
		);
	});
	it("filters crawlers without excluding ordinary browsers", () => {
		expect(isKnownCrawler("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(
			true,
		);
		expect(isKnownCrawler("facebookexternalhit/1.1")).toBe(true);
		expect(
			isKnownCrawler("Mozilla/5.0 AppleWebKit/537.36 Chrome/125 Safari/537.36"),
		).toBe(false);
	});
});
