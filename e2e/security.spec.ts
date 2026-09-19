import { request as httpRequest } from "node:http";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { api, setupCreator } from "./feature-helpers";

async function read(request: APIRequestContext, name: string, input?: unknown) {
	const response = await request.get(`/api/trpc/${name}`, {
		params:
			input === undefined ? {} : { input: JSON.stringify({ json: input }) },
	});
	expect(response.ok(), await response.text()).toBe(true);
	return (await response.json()).result.data.json;
}

test("accounts cannot modify another creator's links, sections, or design", async ({
	page,
	playwright,
	baseURL,
}) => {
	const { profile } = await setupCreator(page);
	const link = await api(page.request, "links.add", {
		title: "Owner link",
		url: "https://example.com/owner",
	});
	const section = await api(page.request, "links.createSection", {
		title: "Owner section",
		splitIndex: 1,
	});
	const attacker = await playwright.request.newContext({ baseURL });
	try {
		const username = `other${Date.now().toString(36)}`;
		expect(
			(
				await attacker.post("/api/auth/sign-up/email", {
					data: {
						name: "Other creator",
						email: `${username}@example.test`,
						password: "SecurityReviewPassword123!",
					},
				})
			).ok(),
		).toBe(true);
		await api(attacker, "profile.create", { username });
		const own = await api(attacker, "links.add", {
			title: "Other link",
			url: "https://example.com/other",
		});
		for (const [name, input] of [
			["links.update", { id: link.id, title: "Taken over" }],
			["links.bulkAction", { ids: [own.id, link.id], action: "delete" }],
			[
				"links.add",
				{
					title: "Injected",
					url: "https://example.com",
					sectionId: section.id,
				},
			],
			["links.updateSection", { id: section.id, title: "Taken over" }],
			["links.deleteSection", { id: section.id }],
			["health.check", { ids: [link.id] }],
			[
				"design.save",
				{
					displayName: "Injected",
					bio: "",
					avatarUrl: null,
					theme: "default",
					fontFamily: "work",
					buttonStyle: "rounded",
					accentColor: null,
					pageBackgroundType: "theme",
					contentBlocks: [],
					linkEdits: [
						{ id: link.id, title: "Taken over", url: "https://example.com" },
					],
				},
			],
		] as const) {
			const response = await attacker.post(`/api/trpc/${name}`, {
				data: { json: input },
			});
			expect(response.status(), `${name}: ${await response.text()}`).toBe(404);
		}
		await api(attacker, "links.delete", { id: link.id }); // scoped deletion is an idempotent no-op
		expect((await read(page.request, "links.list")).links[0].title).toBe(
			"Owner link",
		);
		expect((await read(attacker, "links.list")).links).toHaveLength(1);
		expect((await read(page.request, "profile.getCurrent")).userId).toBe(
			profile.userId,
		);
	} finally {
		await attacker.dispose();
	}
});

test("public profiles exclude account IDs and private diagnostics", async ({
	page,
	request,
}) => {
	const { username } = await setupCreator(page);
	await api(page.request, "links.add", {
		title: "Public link",
		url: "https://example.com/public",
	});
	await api(page.request, "links.add", {
		title: "Secret draft",
		url: "https://example.com/private",
		isActive: false,
	});
	const data = await read(request, "links.getPublic", { username });
	expect(data.links).toHaveLength(1);
	expect(data.unsectionedLinks[0].title).toBe("Public link");
	const serialized = JSON.stringify(data);
	for (const key of [
		"userId",
		"healthState",
		"healthFinalUrl",
		"healthCheckedAt",
		"createdAt",
		"updatedAt",
		"Secret draft",
	])
		expect(serialized).not.toContain(key);
	const response = await request.get(`/u/${username}`);
	expect(response.ok()).toBe(true);
	expect(await response.text()).not.toContain("Secret draft");
});

test("cross-origin and sibling-site mutations are rejected without changing data", async ({
	page,
	baseURL,
}) => {
	const { profile } = await setupCreator(page);
	for (const headers of [
		{ origin: "https://untrusted.example.com" },
		{ "sec-fetch-site": "same-site" },
		{ origin: "null" },
	] as Record<string, string>[]) {
		const response = await page.request.post("/api/trpc/profile.update", {
			headers,
			data: { json: { displayName: "Injected" } },
		});
		expect(response.status()).toBe(403);
	}
	const forged = await page.request.post("/api/auth/sign-in/email", {
		headers: {
			host: "untrusted.example.com",
			origin: "http://untrusted.example.com",
		},
		data: { email: "unknown@example.test", password: "anything" },
	});
	expect(forged.status(), await forged.text()).toBe(403);
	expect((await read(page.request, "profile.getCurrent")).displayName).toBe(
		profile.displayName,
	);
	const valid = await page.request.post("/api/trpc/profile.update", {
		headers: { origin: baseURL! },
		data: { json: { displayName: "Allowed edit" } },
	});
	expect(valid.ok(), await valid.text()).toBe(true);
});

test("oversized and excessive batched requests fail before execution", async ({
	request,
	baseURL,
}) => {
	const oversizedAuth = await request.post("/api/auth/sign-in/email", {
		data: { email: "x".repeat(70_000), password: "example" },
	});
	expect(oversizedAuth.status()).toBe(413);
	const oversizedRpc = await request.post("/api/trpc/profile.create", {
		data: { json: { username: "x".repeat(1024 * 1024) } },
	});
	expect(oversizedRpc.status()).toBe(413);
	const batch = await request.get(
		`/api/trpc/${Array(11).fill("profile.checkUsername").join(",")}`,
		{
			params: {
				batch: "1",
				input: JSON.stringify(
					Object.fromEntries(
						Array.from({ length: 11 }, (_, i) => [
							i,
							{ json: { username: "anyone" } },
						]),
					),
				),
			},
		},
	);
	expect(batch.status(), await batch.text()).toBe(400);
	const status = await new Promise<number>((resolve, reject) => {
		const req = httpRequest(
			`${baseURL}/api/trpc/profile.create`,
			{
				method: "POST",
				headers: {
					"content-type": "application/json",
					"transfer-encoding": "chunked",
				},
			},
			(res) => {
				res.resume();
				res.on("end", () => resolve(res.statusCode ?? 0));
			},
		);
		req.on("error", reject);
		for (let i = 0; i < 17; i++) req.write(Buffer.alloc(64 * 1024, " "));
		req.end();
	});
	expect(status).toBe(413);
});

test("internal errors do not reveal database queries or account details", async ({
	page,
}) => {
	const { username } = await setupCreator(page);
	const response = await page.request.post("/api/trpc/profile.create", {
		data: { json: { username: `${username}x` } },
	});
	expect(response.status()).toBe(500); // unique user constraint, deliberately exercised in isolation
	const body = await response.text();
	expect(body).toContain("Something went wrong. Please try again.");
	for (const secret of [
		"insert into",
		"profiles_user_id",
		"params:",
		"stack",
		username,
	])
		expect(body).not.toContain(secret);
});
