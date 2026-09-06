import { afterEach, describe, expect, it, vi } from "vitest";
import {
	domainHostingConfigured,
	getHostedDomain,
	hostingReady,
	provisionDomain,
} from "./domain-provider";

const hosted = {
	id: "domain-id",
	domain: "links.creator.com",
	status: {
		verified: true,
		certificateStatus: "ISSUED",
		verificationToken: "provider-proof",
		verificationDnsHost: "_verify.links.creator.com",
		dnsRecords: [
			{
				hostlabel: "links",
				fqdn: "links.creator.com",
				recordType: "CNAME",
				requiredValue: "service.up.railway.app",
				status: "VALID",
			},
		],
	},
};
function configure() {
	vi.stubEnv("CUSTOM_DOMAIN_RAILWAY_TOKEN", "test-project-token");
	vi.stubEnv("CUSTOM_DOMAIN_PROJECT_ID", "project");
	vi.stubEnv("CUSTOM_DOMAIN_ENVIRONMENT_ID", "environment");
	vi.stubEnv("CUSTOM_DOMAIN_SERVICE_ID", "service");
}
afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});
describe("Railway domain contract", () => {
	it("requires routing, provider ownership, and a certificate before activation", () => {
		expect(hostingReady(hosted)).toBe(true);
		expect(
			hostingReady({
				...hosted,
				status: { ...hosted.status, verified: false },
			}),
		).toBe(false);
		expect(
			hostingReady({
				...hosted,
				status: { ...hosted.status, certificateStatus: "PENDING" },
			}),
		).toBe(false);
	});
	it("uses project-scoped authentication and provisions only after listing current domains", async () => {
		configure();
		expect(domainHostingConfigured()).toBe(true);
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(
				Response.json({ data: { domains: { customDomains: [] } } }),
			)
			.mockResolvedValueOnce(
				Response.json({ data: { customDomainCreate: hosted } }),
			);
		vi.stubGlobal("fetch", fetch);
		expect(await provisionDomain("links.creator.com")).toEqual({
			hosted,
			managed: true,
		});
		const call = fetch.mock.calls[1];
		expect(call[0]).toBe("https://backboard.railway.com/graphql/v2");
		expect(call[1].headers["Project-Access-Token"]).toBe("test-project-token");
		expect(call[1].redirect).toBe("error");
		expect(JSON.parse(call[1].body).variables.input).toMatchObject({
			projectId: "project",
			environmentId: "environment",
			serviceId: "service",
			domain: "links.creator.com",
		});
	});
	it("adopts an existing mapping without taking ownership of its deletion", async () => {
		configure();
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(
				Response.json({
					data: {
						domains: {
							customDomains: [{ id: hosted.id, domain: hosted.domain }],
						},
					},
				}),
			)
			.mockResolvedValueOnce(Response.json({ data: { customDomain: hosted } }));
		vi.stubGlobal("fetch", fetch);
		expect((await provisionDomain(hosted.domain)).managed).toBe(false);
		expect(fetch).toHaveBeenCalledTimes(2);
	});
	it("does not pass provider errors or credentials back to the caller", async () => {
		configure();
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue(
					Response.json({ errors: [{ message: "private provider detail" }] }),
				),
		);
		await expect(getHostedDomain("id")).rejects.toThrow(
			"Hosting provider could not complete this request",
		);
	});
});
