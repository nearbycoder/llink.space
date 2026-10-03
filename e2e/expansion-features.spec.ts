import {
	expect,
	test,
	type APIRequestContext,
	type Page,
} from "@playwright/test";
import { api, setupCreator } from "./feature-helpers";

async function read(request: APIRequestContext, name: string, input?: unknown) {
	const response = await request.get(`/api/trpc/${name}`, {
		params:
			input === undefined ? {} : { input: JSON.stringify({ json: input }) },
	});
	expect(response.ok(), await response.text()).toBe(true);
	return (await response.json()).result.data.json;
}
async function downloadText(page: Page, action: () => Promise<unknown>) {
	const pending = page.waitForEvent("download");
	await action();
	const stream = await (await pending).createReadStream();
	const chunks: Buffer[] = [];
	for await (const chunk of stream!) chunks.push(chunk);
	return Buffer.concat(chunks).toString();
}
async function openBatch(page: Page) {
	const select = page.getByRole("button", { name: "Select", exact: true });
	if (await select.count()) await select.click();
	await page.getByRole("button", { name: /^Select visible/ }).click();
	await page.getByRole("button", { name: "Batch tools", exact: true }).click();
	return page.getByRole("dialog");
}

test("all seven batch tools preview and save selected links", async ({
	page,
}) => {
	test.setTimeout(90_000);
	const { username } = await setupCreator(page);
	for (const slug of ["a", "b"])
		await api(page.request, "links.add", {
			title: `Launch ${slug}`,
			url: `https://example.com/${slug}?utm_source=test&id=42#read`,
		});
	await page.goto("/dashboard");
	await expect(
		page.getByRole("button", { name: "Select", exact: true }),
	).toBeEnabled();
	let dialog = await openBatch(page);
	await dialog.getByLabel("Action", { exact: true }).selectOption("title");
	await dialog.getByLabel("Find text", { exact: true }).fill("Launch");
	await dialog.getByLabel("Replace with", { exact: true }).fill("Release");
	expect((await read(page.request, "links.list")).links[0].title).toContain(
		"Launch",
	);
	await expect(
		dialog.getByText("After: Release a", { exact: true }),
	).toBeVisible();
	await page.screenshot({
		path: test.info().outputPath("batch-desktop.png"),
		animations: "disabled",
	});
	await dialog
		.getByRole("button", { name: "Apply to 2 links", exact: true })
		.click();
	await expect(dialog).toBeHidden();
	dialog = await openBatch(page);
	await dialog
		.getByLabel("Action", { exact: true })
		.selectOption("description");
	await dialog.getByLabel("New description").fill("Updated together");
	await dialog
		.getByRole("button", { name: "Apply to 2 links", exact: true })
		.click();
	await expect(dialog).toBeHidden();
	dialog = await openBatch(page);
	await dialog.getByLabel("Action", { exact: true }).selectOption("style");
	await dialog.getByLabel("Link icon").selectOption("coffee");
	await dialog.getByLabel("Icon background").fill("#aabbcc");
	await dialog
		.getByRole("button", { name: "Apply to 2 links", exact: true })
		.click();
	await expect(dialog).toBeHidden();
	dialog = await openBatch(page);
	await dialog.getByLabel("Action", { exact: true }).selectOption("url");
	await dialog.getByLabel("Find text", { exact: true }).fill("example.com");
	await dialog.getByLabel("Replace with", { exact: true }).fill("example.org");
	await dialog
		.getByRole("button", { name: "Apply to 2 links", exact: true })
		.click();
	await expect(dialog).toBeHidden();
	dialog = await openBatch(page);
	await dialog.getByLabel("Action", { exact: true }).selectOption("clean");
	await expect(
		dialog.getByText("After: https://example.org/a?id=42#read", {
			exact: true,
		}),
	).toBeVisible();
	await dialog
		.getByRole("button", { name: "Apply to 2 links", exact: true })
		.click();
	await expect(dialog).toBeHidden();
	dialog = await openBatch(page);
	await dialog.getByLabel("Action", { exact: true }).selectOption("duplicate");
	await dialog
		.getByRole("button", { name: "Apply to 2 links", exact: true })
		.click();
	await expect(dialog).toBeHidden();
	let layout = await read(page.request, "links.list");
	expect(layout.links).toHaveLength(4);
	const copies = layout.links.filter((l: any) => l.title.endsWith("(copy)"));
	expect(copies).toHaveLength(2);
	expect(
		copies.every(
			(l: any) =>
				l.isActive === false && !l.featured && !l.publishAt && !l.expireAt,
		),
	).toBe(true);
	expect(
		layout.links.every(
			(l: any) =>
				l.iconUrl === "coffee" &&
				l.iconBgColor === "#aabbcc" &&
				l.description === "Updated together",
		),
	).toBe(true);
	dialog = await openBatch(page);
	await dialog.getByLabel("Action", { exact: true }).selectOption("schedule");
	await dialog
		.getByLabel("Publish time", { exact: true })
		.fill("2050-01-02T10:00");
	await dialog
		.getByLabel("Expiry time", { exact: true })
		.fill("2050-01-01T10:00");
	await expect(dialog.getByRole("button", { name: /Apply to/ })).toBeDisabled();
	await dialog
		.getByLabel("Expiry time", { exact: true })
		.fill("2050-01-03T10:00");
	await dialog
		.getByRole("switch", { name: "Activate links for this schedule" })
		.click();
	await dialog
		.getByRole("button", { name: "Apply to 4 links", exact: true })
		.click();
	await expect(dialog).toBeHidden();
	layout = await read(page.request, "links.list");
	expect(
		layout.links.every((l: any) => l.isActive && l.publishAt && l.expireAt),
	).toBe(true);
	const published = await read(page.request, "links.getPublic", { username });
	expect(published.links).toHaveLength(0);
});

test("batch ownership, stale versions and validation reject the entire batch", async ({
	page,
	playwright,
	baseURL,
}) => {
	await setupCreator(page);
	const first = await api(page.request, "links.add", {
		title: "First",
		url: "https://example.com/a",
	});
	const second = await api(page.request, "links.add", {
		title: "Second",
		url: "https://example.com/b",
	});
	const other = await playwright.request.newContext({ baseURL });
	try {
		const username = "other" + Date.now().toString(36);
		await other.post("/api/auth/sign-up/email", {
			data: {
				name: "Other",
				email: username + "@example.test",
				password: "FeaturePassword123!",
			},
		});
		await api(other, "profile.create", { username });
		const foreign = await api(other, "links.add", {
			title: "Foreign",
			url: "https://example.com/private",
		});
		const send = (selection: any[], operation: unknown) =>
			page.request.post("/api/trpc/links.batchEdit", {
				data: {
					json: {
						selection: selection.map((l) => ({
							id: l.id,
							updatedAt: l.updatedAt,
						})),
						operation,
					},
				},
			});
		expect(
			(
				await send([first, foreign], {
					kind: "description",
					description: "Unexpected",
				})
			).status(),
		).toBe(404);
		expect(
			(await read(page.request, "links.list")).links[0].description,
		).toBeNull();
		await api(page.request, "links.update", {
			id: first.id,
			title: "Changed elsewhere",
		});
		expect((await send([first, second], { kind: "duplicate" })).status()).toBe(
			409,
		);
		expect((await read(page.request, "links.list")).links).toHaveLength(2);
		let layout = await read(page.request, "links.list");
		expect(
			(
				await send(layout.links, {
					kind: "url",
					find: "https://",
					replacement: "javascript:",
				})
			).status(),
		).toBe(400);
		expect(
			(
				await send(layout.links, {
					kind: "schedule",
					publishAt: "2050-02-02T00:00:00Z",
					expireAt: "2050-02-01T00:00:00Z",
					activate: true,
				})
			).status(),
		).toBe(400);
		expect(
			(
				await send([layout.links[0], layout.links[0]], {
					kind: "description",
					description: "Repeated",
				})
			).status(),
		).toBe(400);
		layout = await read(page.request, "links.list");
		expect(layout.links[1].description).toBeNull();
		expect(layout.links.every((l: any) => l.url.startsWith("https://"))).toBe(
			true,
		);
	} finally {
		await other.dispose();
	}
});

test("JSON import is atomic and concurrent submissions are deduplicated", async ({
	page,
}) => {
	await setupCreator(page);
	const valid = {
		title: "JSON site",
		url: "https://example.com/json",
		description: "Kept description",
		iconUrl: "coffee",
		iconBgColor: "#aabbcc",
	};
	for (const text of [
		"{",
		JSON.stringify({ version: 99, links: [valid] }),
		JSON.stringify([valid, { title: "Bad", url: "javascript:alert(1)" }]),
		JSON.stringify(Array(51).fill(valid)),
	]) {
		expect(
			(
				await page.request.post("/api/trpc/links.importCatalog", {
					data: { json: { text } },
				})
			).status(),
		).toBe(400);
		expect((await read(page.request, "links.list")).links).toHaveLength(0);
	}
	const text = JSON.stringify({ version: 1, links: [valid] });
	const results = await Promise.all([
		api(page.request, "links.importCatalog", { text }),
		api(page.request, "links.importCatalog", { text }),
	]);
	expect(results.reduce((sum, r) => sum + r.count, 0)).toBe(1);
	const layout = await read(page.request, "links.list");
	expect(layout.links).toHaveLength(1);
	expect(layout.links[0]).toMatchObject({
		...valid,
		isActive: false,
		sectionId: null,
	});
});

test("bookmark and JSON file imports preview drafts and JSON export preserves content", async ({
	page,
}) => {
	await setupCreator(page);
	await page.goto("/dashboard");
	await page.getByRole("button", { name: "Import links", exact: true }).click();
	let dialog = page.getByRole("dialog");
	await dialog.locator("input[type=file]").setInputFiles({
		name: "bookmarks.html",
		mimeType: "text/html",
		buffer: Buffer.from(
			'<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><DT><A HREF="https://example.com/book?x=1&amp;y=2">Book &amp; notes</A></DL>',
		),
	});
	await expect(dialog.getByText("Book & notes", { exact: true })).toBeVisible();
	await dialog.locator("input[type=file]").setInputFiles({
		name: "invalid.html",
		mimeType: "text/html",
		buffer: Buffer.from("<h1>Not bookmarks</h1>"),
	});
	await expect(
		dialog.getByRole("button", { name: "Import as drafts", exact: true }),
	).toBeDisabled();
	await expect(dialog.getByText("Book & notes", { exact: true })).toBeHidden();
	await dialog.locator("input[type=file]").setInputFiles({
		name: "bookmarks.html",
		mimeType: "text/html",
		buffer: Buffer.from(
			'<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><DT><A HREF="https://example.com/book?x=1&amp;y=2">Book &amp; notes</A></DL>',
		),
	});
	await expect(dialog.getByText("Book & notes", { exact: true })).toBeVisible();
	await dialog
		.getByRole("button", { name: "Import as drafts", exact: true })
		.click();
	await expect(dialog).toBeHidden();
	await page.getByRole("button", { name: "Import links", exact: true }).click();
	dialog = page.getByRole("dialog");
	await dialog.locator("input[type=file]").setInputFiles({
		name: "catalog.json",
		mimeType: "application/json",
		buffer: Buffer.from(
			JSON.stringify({
				version: 1,
				links: [
					{
						title: "Catalog",
						url: "https://example.com/catalog",
						description: "Round trip",
						iconUrl: "coffee",
						iconBgColor: "#aabbcc",
					},
				],
			}),
		),
	});
	await expect(dialog.getByText("Catalog", { exact: true })).toBeVisible();
	await dialog
		.getByRole("button", { name: "Import as drafts", exact: true })
		.click();
	await expect(dialog).toBeHidden();
	await page.getByText("More link tools", { exact: true }).click();
	const json = JSON.parse(
		await downloadText(page, () =>
			page
				.getByRole("button", { name: "Export JSON catalog", exact: true })
				.click(),
		),
	);
	expect(json.version).toBe(1);
	expect(json.links).toHaveLength(2);
	expect(json.links.find((l: any) => l.title === "Catalog")).toMatchObject({
		description: "Round trip",
		iconUrl: "coffee",
		iconBgColor: "#aabbcc",
	});
	expect(json.links[0]).not.toHaveProperty("profileId");
	expect(json.links[0]).not.toHaveProperty("id");
});

test("saving a sort previews the complete page order and preserves section boundaries", async ({
	page,
}) => {
	const { username } = await setupCreator(page);
	for (const title of ["Zebra", "Apple"])
		await api(page.request, "links.add", {
			title,
			url: "https://example.com/" + title,
		});
	await api(page.request, "links.createSection", {
		title: "Collection",
		splitIndex: 0,
	});
	for (const title of ["Z notes", "A notes"])
		await api(page.request, "links.add", {
			title,
			url: "https://example.com/" + title.replace(" ", "-"),
		});
	await page.goto("/dashboard");
	await page.getByLabel("Sort links").selectOption("az");
	await page
		.getByRole("button", { name: "Save as page order", exact: true })
		.click();
	const dialog = page.getByRole("dialog");
	await expect(
		dialog.getByRole("heading", { name: "Collection", exact: true }),
	).toBeVisible();
	expect(
		(
			await read(page.request, "links.getPublic", { username })
		).sections[0].links.map((l: any) => l.title),
	).toEqual(["Zebra", "Apple"]);
	await dialog
		.getByRole("button", { name: "Save page order", exact: true })
		.click();
	await expect(dialog).toBeHidden();
	const published = await read(page.request, "links.getPublic", { username });
	expect(published.sections[0].links.map((l: any) => l.title)).toEqual([
		"Apple",
		"Zebra",
	]);
	expect(published.unsectionedLinks.map((l: any) => l.title)).toEqual([
		"A notes",
		"Z notes",
	]);
});

test("six new blocks publish safely, remain interactive and restore through style backups", async ({
	page,
}) => {
	test.setTimeout(90_000);
	const { username } = await setupCreator(page);
	const profile = await read(page.request, "profile.getCurrent");
	const blocks = [
		{
			type: "audio",
			title: "Listen",
			url: "https://example.com/sample.mp3",
			body: "Audio notes",
		},
		{
			type: "button",
			title: "Book a call",
			url: "https://example.com/book",
			body: "Let us make something",
		},
		{ type: "divider", title: "Details", url: "", body: "" },
		{
			type: "code",
			title: "Snippet",
			url: "",
			body: "<script>window.blockExecuted=true</script>",
		},
		{
			type: "checklist",
			title: "Before your visit",
			url: "",
			body: "- [ ] Bring a notebook\n- [x] Choose a day",
		},
		{
			type: "hours",
			title: "Studio hours",
			url: "",
			body: "Monday | 09:00-17:00\nSunday | Closed",
			timeZone: "America/Chicago",
		},
	].map((b) => ({ ...b, id: crypto.randomUUID(), afterLinkId: null }));
	await api(page.request, "design.save", {
		displayName: "Studio",
		bio: "Block showcase",
		avatarUrl: null,
		theme: "slate",
		fontFamily: "work",
		buttonStyle: "rounded",
		accentColor: null,
		pageBackgroundType: "theme",
		contentBlocks: blocks,
		linkEdits: [],
	});
	await page.goto("/dashboard/design");
	await expect(
		page.getByRole("button", { name: "Publish design", exact: true }),
	).toBeDisabled();
	await expect(page.getByLabel("Block type")).toHaveCount(6);
	await expect(page.getByLabel("Hours time zone")).toHaveValue(
		"America/Chicago",
	);
	await page
		.getByRole("button", { name: "Add content block", exact: true })
		.click();
	const last = page.getByLabel("Block type").last();
	await last.selectOption("button");
	const card = last.locator("xpath=../..");
	await card.getByLabel("Title / image alt text").fill("New action");
	await card.getByLabel("Button destination").fill("https://example.com/new");
	await page
		.getByRole("button", { name: "Publish design", exact: true })
		.click();
	await expect(
		page.getByText("Page design published", { exact: true }),
	).toBeVisible();
	await page.getByText("Style backups", { exact: true }).click();
	const backup = await downloadText(page, () =>
		page
			.getByRole("button", { name: "Download style backup", exact: true })
			.click(),
	);
	await page.getByLabel("Restore style backup").setInputFiles({
		name: "style.json",
		mimeType: "application/json",
		buffer: Buffer.from(backup),
	});
	await expect(page.getByRole("dialog")).toContainText("7 content blocks");
	await page
		.getByRole("button", { name: "Restore backup", exact: true })
		.click();
	await expect(page.getByLabel("Block type")).toHaveCount(7);
	await page.goto("/u/" + username);
	await expect(
		page.getByRole("link", { name: "Book a call", exact: true }),
	).toHaveAttribute("href", "https://example.com/book");
	await expect(
		page.getByRole("link", { name: "New action", exact: true }),
	).toBeVisible();
	await expect(page.locator("audio")).toHaveAttribute("preload", "none");
	await expect(page.getByText("Monday", { exact: true })).toBeVisible();
	await expect(
		page.getByText("All times in America/Chicago", { exact: true }),
	).toBeVisible();
	await expect(
		page.getByText("<script>window.blockExecuted=true</script>", {
			exact: true,
		}),
	).toBeVisible();
	expect(
		await page.evaluate(() => (window as any).blockExecuted),
	).toBeUndefined();
	await expect(
		page.getByText("1 of 2 complete · for this visit", { exact: true }),
	).toBeVisible();
	await page
		.getByRole("checkbox", { name: "Bring a notebook", exact: true })
		.check();
	await expect(
		page.getByText("2 of 2 complete · for this visit", { exact: true }),
	).toBeVisible();
	await page.screenshot({
		path: test.info().outputPath("blocks-desktop.png"),
		fullPage: true,
		animations: "disabled",
	});
	await page.setViewportSize({ width: 390, height: 844 });
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth,
		),
	).toBe(true);
	await page.screenshot({
		path: test.info().outputPath("blocks-mobile.png"),
		fullPage: true,
		animations: "disabled",
	});
	const data = await read(page.request, "links.getPublic", { username });
	expect(data.profile.id).toBe(profile.id);
});

test("device breakdown and UTC heatmap use full range, account ownership and downloadable values", async ({
	page,
}) => {
	const { profile } = await setupCreator(page);
	const link = await api(page.request, "links.add", {
		title: "Analytics link",
		url: "https://example.com/insights",
	});
	const { Client } = await import("pg");
	const db = new Client({ connectionString: process.env.DATABASE_URL });
	await db.connect();
	try {
		await db.query(
			"INSERT INTO click_events(link_id,profile_id,user_agent,clicked_at) VALUES ($1,$2,'iPhone Mobile',now() at time zone 'UTC'),($1,$2,'Macintosh',now() at time zone 'UTC'),($1,$2,'iPad',now() at time zone 'UTC'),($1,$2,null,now() at time zone 'UTC'),($1,$2,'Android Mobile',(now() at time zone 'UTC')-interval '45 days')",
			[link.id, profile.id],
		);
	} finally {
		await db.end();
	}
	const summary = await read(page.request, "analytics.getSummary", { days: 7 });
	expect(summary.periodClicks).toBe(4);
	expect(summary.devices.reduce((s: number, r: any) => s + r.count, 0)).toBe(4);
	expect(summary.clickHeatmap).toHaveLength(168);
	expect(
		summary.clickHeatmap.reduce((s: number, r: any) => s + r.count, 0),
	).toBe(4);
	await page.goto("/dashboard/analytics?days=7");
	await expect(
		page.getByRole("heading", { name: "Clicks by device", exact: true }),
	).toBeVisible();
	const csv = await downloadText(page, () =>
		page
			.getByRole("button", { name: "Export click times", exact: true })
			.click(),
	);
	expect(csv.trim().split("\n")).toHaveLength(169);
	expect(csv).toContain("Hour (UTC)");
	await page.getByRole("button", { name: "90d", exact: true }).click();
	await expect(page).toHaveURL(/days=90/);
	await expect(page.getByText("Busiest:", { exact: false })).toBeVisible();
	const long = await read(page.request, "analytics.getSummary", { days: 90 });
	expect(long.devices.reduce((s: number, r: any) => s + r.count, 0)).toBe(5);
	await expect(
		page.getByRole("complementary").locator('nav a[aria-current="page"]'),
	).toHaveCount(1);
	await expect(
		page.getByRole("complementary").locator('nav a[aria-current="page"]'),
	).toHaveText("Analytics");
	await page.screenshot({
		path: test.info().outputPath("insights-desktop.png"),
		fullPage: true,
		animations: "disabled",
	});
	await page.setViewportSize({ width: 390, height: 844 });
	await expect
		.poll(() =>
			page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
		)
		.toBe(true);
	await page.screenshot({
		path: test.info().outputPath("insights-mobile.png"),
		fullPage: true,
		animations: "disabled",
	});
});

test("badge generation and batch dialogs fit mobile and keyboard dismissal preserves data", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await setupCreator(page);
	await api(page.request, "links.add", {
		title: "Mobile",
		url: "https://example.com/mobile",
	});
	await page.goto("/dashboard");
	let dialog = await openBatch(page);
	await dialog.getByLabel("Action", { exact: true }).selectOption("title");
	await dialog.getByLabel("Find text", { exact: true }).fill("Mobile");
	await dialog.getByLabel("Replace with", { exact: true }).fill("Changed");
	expect(
		await dialog
			.getByLabel("Find text", { exact: true })
			.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
	).toBeGreaterThanOrEqual(16);
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth,
		),
	).toBe(true);
	await page.screenshot({
		path: test.info().outputPath("batch-mobile.png"),
		animations: "disabled",
	});
	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();
	expect((await read(page.request, "links.list")).links[0].title).toBe(
		"Mobile",
	);
	await page.goto("/dashboard/profile");
	await page
		.getByRole("button", { name: "Website badge", exact: true })
		.click();
	dialog = page.getByRole("dialog");
	await dialog.getByLabel("Badge label").fill("<img src=x>");
	await dialog.getByLabel("Badge appearance").selectOption("light");
	const code = await downloadText(page, () =>
		dialog.getByRole("button", { name: "Download badge", exact: true }).click(),
	);
	expect(code).toContain("&lt;img src=x&gt;");
	expect(code).not.toContain("<img");
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth,
		),
	).toBe(true);
	await page.screenshot({
		path: test.info().outputPath("badge-mobile.png"),
		animations: "disabled",
	});
	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();
	await expect(
		page.getByRole("button", { name: "Website badge", exact: true }),
	).toBeFocused();
});

test("new controls wait for hydration under delayed script loading", async ({
	page,
}) => {
	test.setTimeout(60_000);
	const { username } = await setupCreator(page);
	await api(page.request, "links.add", {
		title: "Ready link",
		url: "https://example.com/ready",
	});
	await api(page.request, "design.save", {
		displayName: "Ready",
		bio: "",
		avatarUrl: null,
		theme: "slate",
		fontFamily: "work",
		buttonStyle: "rounded",
		accentColor: null,
		pageBackgroundType: "theme",
		contentBlocks: [
			{
				id: crypto.randomUUID(),
				type: "checklist",
				title: "Ready list",
				body: "- [ ] First item",
				url: "",
				afterLinkId: null,
			},
		],
		linkEdits: [],
	});
	async function delayed(path: string, verify: () => Promise<void>) {
		let release!: () => void;
		const scripts = new Promise<void>((resolve) => {
			release = resolve;
		});
		const block = async (route: import("@playwright/test").Route) => {
			if (route.request().resourceType() === "script") await scripts;
			await route.continue();
		};
		await page.route("**/*", block);
		try {
			await page.goto(path, { waitUntil: "commit" });
			await verify();
		} finally {
			release();
		}
		await page.unrouteAll({ behavior: "wait" });
	}
	await delayed("/dashboard/profile", async () => {
		await expect(
			page.getByRole("button", { name: "Website badge", exact: true }),
		).toBeDisabled();
	});
	await page
		.getByRole("button", { name: "Website badge", exact: true })
		.click();
	await expect(
		page.getByRole("dialog").getByLabel("Badge label"),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await delayed("/dashboard/analytics", async () => {
		await expect(
			page.getByRole("button", { name: "Export click times", exact: true }),
		).toBeDisabled();
		await expect(
			page.getByRole("button", { name: "Export device data", exact: true }),
		).toBeDisabled();
	});
	const csv = await downloadText(page, () =>
		page
			.getByRole("button", { name: "Export device data", exact: true })
			.click(),
	);
	expect(csv).toContain("Device,Clicks,Percent");
	await delayed("/dashboard", async () => {
		await expect(
			page.getByRole("button", { name: "Select", exact: true }),
		).toBeDisabled();
		await page.getByText("More link tools", { exact: true }).click();
		await expect(
			page.getByRole("button", { name: "Export JSON catalog", exact: true }),
		).toBeDisabled();
	});
	const catalog = JSON.parse(
		await downloadText(page, () =>
			page
				.getByRole("button", { name: "Export JSON catalog", exact: true })
				.click(),
		),
	);
	expect(catalog.links[0].title).toBe("Ready link");
	await delayed("/u/" + username, async () => {
		await expect(
			page.getByRole("checkbox", { name: "First item", exact: true }),
		).toBeDisabled();
	});
	await page.getByRole("checkbox", { name: "First item", exact: true }).check();
	await expect(
		page.getByText("1 of 1 complete · for this visit", { exact: true }),
	).toBeVisible();
});

test("computed invalid titles reject all rows and URL changes clear cached health without changing IDs", async ({
	page,
}) => {
	const { profile } = await setupCreator(page);
	const short = await api(page.request, "links.add", {
		title: "A",
		url: "https://example.com/short",
	});
	const long = await api(page.request, "links.add", {
		title: "A".repeat(99),
		url: "https://example.com/long",
	});
	const send = async (operation: unknown) => {
		const layout = await read(page.request, "links.list");
		return page.request.post("/api/trpc/links.batchEdit", {
			data: {
				json: {
					selection: layout.links.map((l: any) => ({
						id: l.id,
						updatedAt: l.updatedAt,
					})),
					operation,
				},
			},
		});
	};
	expect(
		(await send({ kind: "title", find: "A", replacement: "BB" })).status(),
	).toBe(400);
	let layout = await read(page.request, "links.list");
	expect(layout.links.map((l: any) => l.title)).toEqual(["A", "A".repeat(99)]);
	const { Client } = await import("pg");
	const db = new Client({ connectionString: process.env.DATABASE_URL });
	await db.connect();
	try {
		await db.query(
			"UPDATE links SET health_checked_at=now(),health_state='healthy',health_status_code=200,health_final_url=url WHERE profile_id=$1",
			[profile.id],
		);
	} finally {
		await db.end();
	}
	expect(
		(await send({ kind: "description", description: "Metadata only" })).ok(),
	).toBe(true);
	layout = await read(page.request, "links.list");
	expect(layout.links.every((l: any) => l.healthState === "healthy")).toBe(
		true,
	);
	expect(
		(
			await send({
				kind: "url",
				find: "example.com",
				replacement: "example.org",
			})
		).ok(),
	).toBe(true);
	layout = await read(page.request, "links.list");
	expect(layout.links.map((l: any) => l.id)).toEqual([short.id, long.id]);
	expect(
		layout.links.every(
			(l: any) =>
				l.healthState === null &&
				l.healthStatusCode === null &&
				l.healthFinalUrl === null &&
				l.healthCheckedAt === null,
		),
	).toBe(true);
});

test("native audio loads a safe remote file only after playback is requested", async ({
	page,
}) => {
	const { username } = await setupCreator(page);
	const frames = 8000,
		wav = Buffer.alloc(44 + frames * 2);
	wav.write("RIFF", 0);
	wav.writeUInt32LE(wav.length - 8, 4);
	wav.write("WAVEfmt ", 8);
	wav.writeUInt32LE(16, 16);
	wav.writeUInt16LE(1, 20);
	wav.writeUInt16LE(1, 22);
	wav.writeUInt32LE(8000, 24);
	wav.writeUInt32LE(16000, 28);
	wav.writeUInt16LE(2, 32);
	wav.writeUInt16LE(16, 34);
	wav.write("data", 36);
	wav.writeUInt32LE(frames * 2, 40);
	let requests = 0;
	await page.route("https://media.example.test/preview.wav", async (route) => {
		requests++;
		await route.fulfill({ contentType: "audio/wav", body: wav });
	});
	await api(page.request, "design.save", {
		displayName: "Audio studio",
		bio: "",
		avatarUrl: null,
		theme: "slate",
		fontFamily: "work",
		buttonStyle: "rounded",
		accentColor: null,
		pageBackgroundType: "theme",
		contentBlocks: [
			{
				id: crypto.randomUUID(),
				type: "audio",
				title: "Studio note",
				body: "A quiet one-second fixture.",
				url: "https://media.example.test/preview.wav",
				afterLinkId: null,
			},
		],
		linkEdits: [],
	});
	await page.goto("/u/" + username);
	const player = page.locator("audio");
	await expect(player).toHaveAttribute("preload", "none");
	expect(await player.evaluate((el: HTMLAudioElement) => el.paused)).toBe(true);
	expect(requests).toBe(0);
	await player.evaluate((el: HTMLAudioElement) => el.play());
	await expect
		.poll(() => player.evaluate((el: HTMLAudioElement) => el.duration))
		.toBe(1);
	expect(requests).toBeGreaterThan(0);
});
