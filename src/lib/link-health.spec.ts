import { describe, expect, it, vi } from "vitest";
import {
	inspectLink,
	isPublicAddress,
	resolvePublicTarget,
} from "./link-health";

describe("safe destination checks", () => {
	it("rejects local, reserved, mapped and transition addresses", () => {
		for (const address of [
			"127.0.0.1",
			"10.1.2.3",
			"169.254.169.254",
			"100.64.1.1",
			"168.63.129.16",
			"192.88.99.1",
			"192.168.0.1",
			"::1",
			"::ffff:127.0.0.1",
			"fc00::1",
			"fe80::1",
			"2001:db8::1",
			"2002:7f00:1::",
		])
			expect(isPublicAddress(address), address).toBe(false);
		expect(isPublicAddress("93.184.216.34")).toBe(true);
		expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
	});
	it("blocks mixed DNS answers and pins the resolved public address", async () => {
		await expect(
			resolvePublicTarget("https://example.com", async () => [
				{ address: "93.184.216.34", family: 4 },
				{ address: "127.0.0.1", family: 4 },
			]),
		).rejects.toThrow("blocked");
		const target = await resolvePublicTarget(
			"https://example.com",
			async () => [{ address: "93.184.216.34", family: 4 }],
		);
		expect(target.address).toBe("93.184.216.34");
	});
	it("revalidates redirects and never probes a private destination", async () => {
		const probe = vi
			.fn()
			.mockResolvedValue({ status: 302, location: "http://127.0.0.1/private" });
		const result = await inspectLink("https://example.com", {
			resolve: async () => [{ address: "93.184.216.34", family: 4 }],
			probe,
		});
		expect(result.healthState).toBe("blocked");
		expect(probe).toHaveBeenCalledTimes(1);
	});
	it("reports redirects and distinguishes restricted responses", async () => {
		const probe = vi
			.fn()
			.mockResolvedValueOnce({ status: 301, location: "/new" })
			.mockResolvedValueOnce({ status: 200 });
		const deps = {
			resolve: async () => [{ address: "93.184.216.34", family: 4 }],
			probe,
		};
		expect(await inspectLink("https://example.com/old", deps)).toMatchObject({
			healthState: "redirected",
			healthFinalUrl: "https://example.com/new",
		});
		probe.mockResolvedValue({ status: 403 });
		expect((await inspectLink("https://example.com", deps)).healthState).toBe(
			"restricted",
		);
	});
	it("blocks trailing-dot internal hostnames and oversized redirect targets", async () => {
		for (const url of [
			"http://localhost./secret",
			"http://metadata.google.internal./computeMetadata/v1/",
			"http://printer.home.arpa/",
		]) {
			await expect(resolvePublicTarget(url)).rejects.toThrow("blocked");
		}
		const result = await inspectLink("https://example.com", {
			resolve: async () => [{ address: "93.184.216.34", family: 4 }],
			probe: async () => ({
				status: 302,
				location: `https://example.com/${"a".repeat(2100)}`,
			}),
		});
		expect(result.healthState).toBe("blocked");
	});
});
