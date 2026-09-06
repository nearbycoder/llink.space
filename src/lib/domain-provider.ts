import { z } from "zod";
import { readStreamWithLimit } from "./request-body";

const dnsRecord = z.object({
	hostlabel: z.string(),
	fqdn: z.string(),
	recordType: z.string(),
	requiredValue: z.string(),
	status: z.string(),
});
export const hostedDomainSchema = z.object({
	id: z.string(),
	domain: z.string(),
	status: z.object({
		verified: z.boolean(),
		verificationToken: z.string().nullable(),
		verificationDnsHost: z.string().nullable(),
		certificateStatus: z.string(),
		dnsRecords: z.array(dnsRecord),
	}),
});
export type HostedDomain = z.infer<typeof hostedDomainSchema>;
const domainFields =
	"id domain status { verified verificationToken verificationDnsHost certificateStatus dnsRecords { hostlabel fqdn recordType requiredValue status } }";
function config() {
	return {
		token: process.env.CUSTOM_DOMAIN_RAILWAY_TOKEN,
		projectId:
			process.env.CUSTOM_DOMAIN_PROJECT_ID ?? process.env.RAILWAY_PROJECT_ID,
		environmentId:
			process.env.CUSTOM_DOMAIN_ENVIRONMENT_ID ??
			process.env.RAILWAY_ENVIRONMENT_ID,
		serviceId:
			process.env.CUSTOM_DOMAIN_SERVICE_ID ?? process.env.RAILWAY_SERVICE_ID,
	};
}
export function domainHostingConfigured() {
	const c = config();
	return Boolean(c.token && c.projectId && c.environmentId && c.serviceId);
}
async function graphql(query: string, variables: Record<string, unknown>) {
	const c = config();
	if (!domainHostingConfigured())
		throw new Error("Custom-domain hosting is not configured");
	const response = await fetch("https://backboard.railway.com/graphql/v2", {
		method: "POST",
		redirect: "error",
		signal: AbortSignal.timeout(10000),
		headers: {
			"content-type": "application/json",
			"Project-Access-Token": c.token ?? "",
		},
		body: JSON.stringify({ query, variables }),
	});
	if (!response.ok) {
		await response.body?.cancel();
		throw new Error(`Hosting provider returned ${response.status}`);
	}
	const result = JSON.parse(
		new TextDecoder().decode(
			await readStreamWithLimit(response.body, 512 * 1024),
		),
	);
	if (result.errors?.length || !result.data)
		throw new Error("Hosting provider could not complete this request");
	return result.data;
}
export async function getHostedDomain(id: string) {
	const data = await graphql(
		`query($id:String!,$projectId:String!){customDomain(id:$id,projectId:$projectId){${domainFields}}}`,
		{ id, projectId: config().projectId },
	);
	return hostedDomainSchema.parse(data.customDomain);
}
export async function provisionDomain(domain: string) {
	const { projectId, environmentId, serviceId } = config();
	const found = await graphql(
		"query($projectId:String!,$environmentId:String!,$serviceId:String!){domains(projectId:$projectId,environmentId:$environmentId,serviceId:$serviceId){customDomains{id domain}}}",
		{ projectId, environmentId, serviceId },
	);
	const domains = z
		.array(z.object({ id: z.string(), domain: z.string() }))
		.parse(found.domains.customDomains);
	const existing = domains.find((d) => d.domain === domain);
	if (existing)
		return { hosted: await getHostedDomain(existing.id), managed: false };
	const targetPort = process.env.CUSTOM_DOMAIN_TARGET_PORT
		? Number(process.env.CUSTOM_DOMAIN_TARGET_PORT)
		: undefined;
	if (
		targetPort !== undefined &&
		(!Number.isInteger(targetPort) || targetPort < 1 || targetPort > 65535)
	)
		throw new Error("Invalid hosting port configuration");
	const data = await graphql(
		`mutation($input:CustomDomainCreateInput!){customDomainCreate(input:$input){${domainFields}}}`,
		{ input: { projectId, environmentId, serviceId, domain, targetPort } },
	);
	return {
		hosted: hostedDomainSchema.parse(data.customDomainCreate),
		managed: true,
	};
}
export async function deleteHostedDomain(id: string) {
	const result = await graphql(
		"mutation($id:String!){customDomainDelete(id:$id)}",
		{ id },
	);
	if (result.customDomainDelete !== true)
		throw new Error("Hosting provider did not confirm removal");
}
export function hostingReady(hosted: HostedDomain) {
	return (
		hosted.status.verified &&
		hosted.status.certificateStatus === "ISSUED" &&
		hosted.status.dnsRecords.length > 0 &&
		hosted.status.dnsRecords.every((r) => r.status === "VALID")
	);
}
