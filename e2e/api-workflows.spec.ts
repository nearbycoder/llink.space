import { expect, test, type APIRequestContext } from "@playwright/test";

async function callApi(request: APIRequestContext, procedure: string, input: unknown) {
	return request.post(`/api/trpc/${procedure}`, { data: { json: input } });
}

async function readApi(request: APIRequestContext, procedure: string, input?: unknown) {
	const response = await request.get(`/api/trpc/${procedure}`, {
		params: input === undefined ? {} : { input: JSON.stringify({ json: input }) },
	});
	expect(response.ok(), await response.text()).toBe(true);
	return (await response.json()).result.data.json;
}

test("imports are atomic, deduplicated, private, and paused; analytics groups domains", async ({ request, playwright, baseURL }) => {
	const username = `api${Date.now().toString(36)}`;
	const signup = await request.post("/api/auth/sign-up/email", {
		data: { name: "API Creator", email: `${username}@example.test`, password: "LocalReviewPassword123!" },
	});
	expect(signup.ok(), await signup.text()).toBe(true);
	expect((await callApi(request, "profile.create", { username })).ok()).toBe(true);
	const profile = await readApi(request, "profile.getCurrent");

	const invalid = await callApi(request, "links.importLinks", { text: "example.com/valid\njavascript:alert(1)" });
	expect(invalid.status()).toBe(400);
	expect((await readApi(request, "links.list")).links).toHaveLength(0);

	const imports = await Promise.all([
		callApi(request, "links.importLinks", { text: "example.com/one\tFirst link\nexample.com/two" }),
		callApi(request, "links.importLinks", { text: "example.com/one\tFirst link\nexample.com/two" }),
	]);
	for (const response of imports) expect(response.ok(), await response.text()).toBe(true);
	const layout = await readApi(request, "links.list");
	expect(layout.links).toHaveLength(2);
	expect(layout.links.every((link: { isActive: boolean }) => link.isActive === false)).toBe(true);
	expect(layout.links.map((link: { sortOrder: number }) => link.sortOrder)).toEqual([0, 1]);

	const sectionResponse = await callApi(request, "links.createSection", { title: "Featured", splitIndex: 2 });
	expect(sectionResponse.ok()).toBe(true);
	const sectionId = (await sectionResponse.json()).result.data.json.id;
	expect((await callApi(request, "links.reorder", { sectionOrderIds: [sectionId], unsectionedLinkIds: [], sectionLinkOrders: [{ sectionId, linkIds: [layout.links[1].id, layout.links[0].id] }] })).ok()).toBe(true);
	const reordered = await readApi(request, "links.list");
	expect(reordered.links.map((link: { id: string }) => link.id)).toEqual([layout.links[1].id, layout.links[0].id]);
	expect(reordered.links.every((link: { sectionId: string }) => link.sectionId === sectionId)).toBe(true);
	expect((await callApi(request, "links.reorder", { sectionOrderIds: [sectionId], unsectionedLinkIds: [], sectionLinkOrders: [{ sectionId, linkIds: [layout.links[0].id, layout.links[0].id] }] })).status()).toBe(400);

	const guest = await playwright.request.newContext({ baseURL });
	try {
		expect((await callApi(guest, "links.importLinks", { text: "example.com/private" })).status()).toBe(401);
		const publicData = await readApi(guest, "links.getPublic", { username });
		expect(publicData.links).toHaveLength(0);
		const linkId = layout.links[0].id;
		// Paused links cannot accumulate events.
		await callApi(guest, "analytics.recordClick", { linkId, profileId: profile.id });
		expect((await readApi(request, "analytics.getSummary", { days: 7 })).totalClicks).toBe(0);
		expect((await callApi(request, "links.update", { id: linkId, isActive: true })).ok()).toBe(true);
		for (const referrer of ["https://www.example.org/a", "https://example.org/b", "https://example.org/?campaign=1", ""]) {
			expect((await callApi(guest, "analytics.recordClick", { linkId, profileId: profile.id, referrer })).ok()).toBe(true);
		}
		// A replay of the same event is suppressed, even under concurrent delivery.
		await Promise.all(Array.from({ length: 5 }, () => callApi(guest, "analytics.recordClick", { linkId, profileId: profile.id, referrer: "https://example.org/b" })));
		await guest.post("/api/trpc/analytics.recordClick", { headers: { "user-agent": "Googlebot/2.1" }, data: { json: { linkId, profileId: profile.id, referrer: "https://bot.example/" } } });

		const summary = await readApi(request, "analytics.getSummary", { days: 30 });
		expect(summary.totalClicks).toBe(4);
		expect(summary.periodClicks).toBe(4);
		expect(summary.directClicks).toBe(1);
		expect(summary.uniqueReferrers).toBe(1);
		expect(summary.topReferrers).toContainEqual({ source: "example.org", count: 3 });
		expect(summary.clicksByDay).toHaveLength(30);
		expect(summary.clicksByDay.reduce((sum: number, day: { count: number }) => sum + day.count, 0)).toBe(4);
		expect(summary.clicksByDay[29].day).toBe(summary.rangeEnd);
		// Changing referrers cannot bypass the shared per-client rate budget.
		await Promise.all(Array.from({ length: 65 }, (_, index) => callApi(guest, "analytics.recordClick", { linkId, profileId: profile.id, referrer: `https://rate.example/${index}` })));
		const limited = await readApi(request, "analytics.getSummary", { days: 7 });
		expect(limited.totalClicks).toBe(55); // 60 attempts minus 5 duplicate deliveries.

	} finally {
		await guest.dispose();
	}
});
