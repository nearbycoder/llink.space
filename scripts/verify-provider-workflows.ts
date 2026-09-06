// Isolated database integration checks. Provider requests and DNS are replaced;
// this script cannot send email, provision a domain, or contact a real provider.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Resolver } from "node:dns/promises";
import { eq } from "drizzle-orm";

const database = new URL(process.env.DATABASE_URL ?? "http://missing");
assert(["127.0.0.1", "localhost", "[::1]"].includes(database.hostname) && /_(test|review)$/.test(database.pathname), "Use an isolated local *_test or *_review database");
const originalFetch = globalThis.fetch;
const originalResolve = Resolver.prototype.resolveTxt;
const providerEnv = {
  CUSTOM_DOMAIN_RAILWAY_TOKEN: "isolated-project-token",
  CUSTOM_DOMAIN_PROJECT_ID: "isolated-project",
  CUSTOM_DOMAIN_ENVIRONMENT_ID: "isolated-environment",
  CUSTOM_DOMAIN_SERVICE_ID: "isolated-service",
};
const originalEnv = Object.fromEntries(Object.keys(providerEnv).map(k => [k, process.env[k]]));
Object.assign(process.env, providerEnv);
const { db } = await import("../src/db");
const { profiles, subscribers, emailConnections, customDomains } = await import("../src/db/schema");
const { trpcRouter } = await import("../src/integrations/trpc/router");
const id = randomUUID();
const origin = process.env.APP_URL ?? "http://127.0.0.1:3000";
const caller = trpcRouter.createCaller({userId: id, request: new Request(origin, {headers: {origin}})});
let proofHost = "", proofValue = "", hostname = "";
let failAdd = false, failRemove = false, failDomainDelete = false, domainReady = false;
let additions = 0, removals = 0, domainCreates = 0, domainDeletes = 0;
let releaseAdd: (() => void) | undefined;
let notifyAdd: (() => void) | undefined;
let holdAdd: Promise<void> | undefined;
const responseDomain = () => ({id: "isolated-domain", domain: hostname, status: {
  verified: domainReady, verificationToken: null, verificationDnsHost: null,
  certificateStatus: domainReady ? "ISSUED" : "PENDING",
  dnsRecords: [{hostlabel: "links", fqdn: hostname, recordType: "CNAME", requiredValue: "isolated.up.railway.app", status: domainReady ? "VALID" : "PENDING"}],
}});
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  const body = init?.body ? JSON.parse(String(init.body)) : {};
  if (url === "https://api.brevo.com/v3/contacts/lists/42") return new Response(null, {status: 204});
  if (url === "https://api.brevo.com/v3/contacts") {
    assert.equal(new Headers(init?.headers).get("api-key"), "isolated-brevo-key");
    assert.deepEqual(body.listIds, [42]);
    assert(!("emailBlacklisted" in body));
    additions++;
    notifyAdd?.();
    if (holdAdd) await holdAdd;
    return new Response(null, {status: failAdd ? 503 : 204});
  }
  if (url === "https://api.brevo.com/v3/contacts/lists/42/contacts/remove") {
    removals++;
    assert.equal(body.emails.length, 1);
    return new Response(null, {status: failRemove ? 503 : 204});
  }
  if (url === "https://backboard.railway.com/graphql/v2") {
    assert.equal(new Headers(init?.headers).get("Project-Access-Token"), providerEnv.CUSTOM_DOMAIN_RAILWAY_TOKEN);
    if (body.query.includes("customDomainCreate")) {
      domainCreates++;
      assert.equal(body.variables.input.domain, hostname);
      return Response.json({data: {customDomainCreate: responseDomain()}});
    }
    if (body.query.includes("customDomainDelete")) {
      domainDeletes++;
      assert.equal(body.variables.id, "isolated-domain");
      return Response.json({data: {customDomainDelete: !failDomainDelete}});
    }
    if (body.query.includes("customDomain(id:")) return Response.json({data: {customDomain: responseDomain()}});
    return Response.json({data: {domains: {customDomains: []}}});
  }
  throw new Error(`Unexpected external request blocked: ${new URL(url).hostname}`);
}) as typeof fetch;
Resolver.prototype.resolveTxt = async function (host: string) {
  assert.equal(host, proofHost);
  return [[proofValue]];
};
let profileId: string | undefined;
try {
  const [p] = await db.insert(profiles).values({userId: id, username: `provider-${id}`, signupEnabled: true}).returning();
  profileId = p.id;
  const subscribe = (email: string) => caller.audience.subscribe({profileId: p.id, email, consent: true});
  const row = (email: string) => db.query.subscribers.findFirst({where: eq(subscribers.email, email)});
  await caller.audience.connect({apiKey: "isolated-brevo-key", listId: 42});
  const connection = await db.query.emailConnections.findFirst({where: eq(emailConnections.profileId, p.id)});
  assert(connection && !connection.encryptedKey.includes("isolated-brevo-key"));

  const firstEmail = `${id}-first@example.test`;
  const first = await subscribe(firstEmail);
  holdAdd = new Promise<void>(resolve => {releaseAdd = resolve;});
  const started = new Promise<void>(resolve => {notifyAdd = resolve;});
  const syncing = caller.audience.sync();
  await started;
  await assert.rejects(caller.audience.sync(), /current sync/);
  await assert.rejects(caller.audience.disconnect(), /current sync/);
  releaseAdd?.();
  assert.deepEqual(await syncing, {synced: 1, failed: 0});
  holdAdd = undefined;
  assert((await row(firstEmail))?.syncedAt);
  assert.equal(additions, 1);
  await caller.audience.unsubscribe({token: first.token});
  assert((await row(firstEmail))?.providerRemovedAt);

  const neverEmail = `${id}-never@example.test`;
  const never = await subscribe(neverEmail);
  const before = removals;
  await caller.audience.unsubscribe({token: never.token});
  assert.equal(removals, before, "Never-synced opt-outs must not call the provider");
  assert.deepEqual(await caller.audience.sync(), {synced: 0, failed: 0});

  const retryEmail = `${id}-retry@example.test`;
  const retry = await subscribe(retryEmail);
  failAdd = true;
  assert.deepEqual(await caller.audience.sync(), {synced: 0, failed: 1});
  assert((await row(retryEmail))?.syncAttemptedAt);
  assert.equal((await row(retryEmail))?.syncedAt, null);
  failRemove = true;
  await caller.audience.unsubscribe({token: retry.token});
  assert((await row(retryEmail))?.unsubscribedAt);
  assert.equal((await row(retryEmail))?.providerRemovedAt, null);
  await assert.rejects(caller.audience.remove({id: (await row(retryEmail))!.id}), /Could not remove/);
  failRemove = false;
  assert.deepEqual(await caller.audience.sync(), {synced: 1, failed: 0});
  assert((await row(retryEmail))?.providerRemovedAt);
  await caller.audience.remove({id: (await row(retryEmail))!.id});
  assert.equal(await row(retryEmail), undefined);
  console.log("PASS: encrypted connection, exclusive sync lease, opt-out, ambiguous sync failure, removal retry and delete");

  hostname = `links-${id}.example.com`;
  await caller.domains.add({hostname});
  const current = await caller.domains.current();
  proofHost = current.domain!.proofHost;
  proofValue = current.domain!.proofValue;
  assert.equal((await caller.domains.verify()).status, "dns-pending");
  assert.equal(domainCreates, 1);
  domainReady = true;
  assert.equal((await caller.domains.verify()).status, "active");
  const stored = await db.query.customDomains.findFirst({where: eq(customDomains.profileId, p.id)});
  assert.equal(stored?.providerManaged, true);
  failDomainDelete = true;
  await assert.rejects(caller.domains.remove(), /Could not remove/);
  assert(await db.query.customDomains.findFirst({where: eq(customDomains.profileId, p.id)}));
  failDomainDelete = false;
  await caller.domains.remove();
  assert.equal((await caller.domains.current()).domain, null);
  assert.equal(domainDeletes, 2);
  console.log("PASS: DNS ownership, provider provisioning, TLS activation and confirmed removal");
} finally {
  releaseAdd?.();
  globalThis.fetch = originalFetch;
  Resolver.prototype.resolveTxt = originalResolve;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  if (profileId) await db.delete(profiles).where(eq(profiles.id, profileId));
  await db.$client.end();
}
