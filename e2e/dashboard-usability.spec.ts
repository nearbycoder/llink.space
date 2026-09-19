import { expect, test } from "@playwright/test";
import { api, setupCreator } from "./feature-helpers";

async function ready(page: import("@playwright/test").Page) {
	await page.goto("/dashboard");
	await expect(
		page.getByRole("button", { name: "Add link", exact: true }),
	).toBeEnabled();
}

test("status totals filter the catalog and clearing search keeps focus", async ({
	page,
}) => {
	await setupCreator(page);
	await api(page.request, "links.add", {
		title: "Live essay",
		url: "https://example.com/live",
	});
	await api(page.request, "links.add", {
		title: "Paused essay",
		url: "https://example.com/paused",
		isActive: false,
	});
	await ready(page);
	await page.getByLabel("Search links", { exact: true }).fill("not found");
	await page.getByRole("button", { name: "Show paused", exact: true }).click();
	await expect(page.getByLabel("Search links", { exact: true })).toHaveValue(
		"",
	);
	await expect(page.getByLabel("Filter links by status")).toHaveValue("paused");
	await expect(
		page.getByRole("button", { name: "Edit Paused essay", exact: true }),
	).toHaveCount(1);
	await expect(
		page.getByRole("button", { name: "Edit Live essay", exact: true }),
	).toHaveCount(0);
	await page
		.getByRole("button", { name: "Show total links", exact: true })
		.click();
	await page.getByLabel("Search links", { exact: true }).fill("live");
	await page.getByRole("button", { name: "Clear search", exact: true }).click();
	await expect(page.getByLabel("Search links", { exact: true })).toBeFocused();
	await expect(
		page.getByText("Showing 2 of 2 links", { exact: true }),
	).toBeVisible();
});

test("hidden bulk selections are disclosed and can be cleared without changing links", async ({
	page,
}) => {
	await setupCreator(page);
	await api(page.request, "links.add", {
		title: "Alpha",
		url: "https://example.com/a",
	});
	await api(page.request, "links.add", {
		title: "Beta",
		url: "https://example.com/b",
	});
	await ready(page);
	await page.getByRole("button", { name: "Select", exact: true }).click();
	await page
		.getByRole("button", { name: "Select visible (2)", exact: true })
		.click();
	await page.getByLabel("Search links", { exact: true }).fill("Alpha");
	await expect(
		page.getByRole("status").filter({ hasText: "1 selected link is hidden" }),
	).toBeVisible();
	await page
		.getByRole("button", { name: "Clear hidden selection", exact: true })
		.click();
	await expect(page.getByText("1 selected", { exact: true })).toBeVisible();
	await expect(
		page.getByRole("checkbox", { name: "Select Alpha", exact: true }),
	).toBeChecked();
	await page
		.getByRole("button", { name: "Clear all selections", exact: true })
		.click();
	await expect(page.getByText("0 selected", { exact: true })).toBeVisible();
	await expect(
		page
			.getByRole("group", { name: "Bulk link actions" })
			.getByRole("button", { name: "Delete", exact: true }),
	).toBeDisabled();
	const data = (await (await page.request.get("/api/trpc/links.list")).json())
		.result.data.json;
	expect(data.links.every((l: { isActive: boolean }) => l.isActive)).toBe(true);
});

test("duplicating a scheduled spotlight preserves details without publishing or replacing the original", async ({
	page,
}) => {
	await setupCreator(page);
	const publishAt = new Date(Date.now() + 86400000).toISOString();
	const expireAt = new Date(Date.now() + 172800000).toISOString();
	await api(page.request, "links.add", {
		title: "Launch",
		url: "https://example.com/launch",
		description: "Launch notes",
		isActive: true,
		featured: true,
		featureImageUrl: "https://example.com/cover.png",
		ctaLabel: "Read more",
		publishAt,
		expireAt,
	});
	await ready(page);
	await page
		.getByRole("button", { name: "Duplicate Launch", exact: true })
		.click();
	await expect(
		page.getByText(
			"The copy is paused so you can review it before publishing.",
			{ exact: true },
		),
	).toBeVisible();
	const data = (await (await page.request.get("/api/trpc/links.list")).json())
		.result.data.json;
	const copy = data.links.find(
		(l: { title: string }) => l.title === "Launch copy",
	);
	expect(copy).toMatchObject({
		isActive: false,
		featured: false,
		description: "Launch notes",
		featureImageUrl: "https://example.com/cover.png",
		ctaLabel: "Read more",
	});
	expect(new Date(copy.publishAt).toISOString()).toBe(publishAt);
	expect(new Date(copy.expireAt).toISOString()).toBe(expireAt);
	expect(
		data.links.find((l: { title: string }) => l.title === "Launch").featured,
	).toBe(true);
	await page.getByRole("button", { name: "Edit copy", exact: true }).click();
	await expect(
		page
			.getByRole("dialog", { name: "Edit link" })
			.getByLabel("Title", { exact: true }),
	).toHaveValue("Launch copy");
});

test("mobile link form uses readable inputs and keeps its save action accessible", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await setupCreator(page);
	await ready(page);
	await page.getByRole("button", { name: "Add link", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "Add link" });
	await expect(dialog.getByLabel("Title", { exact: true })).toHaveCSS(
		"font-size",
		"16px",
	);
	await dialog.getByLabel("Title", { exact: true }).fill("Mobile link");
	await dialog.getByLabel("URL", { exact: true }).fill("example.com");
	const submit = dialog.getByRole("button", { name: "Add link", exact: true });
	await expect(submit).toBeInViewport();
	await submit.click();
	await expect(dialog).toHaveCount(0);
	await expect(page.getByText("Link added", { exact: true })).toBeVisible();
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth,
		),
	).toBe(true);
});

test("filters wait for hydration before accepting the first interaction", async ({
	page,
}) => {
	await setupCreator(page);
	await api(page.request, "links.add", {
		title: "Zulu first",
		url: "https://example.com/z",
	});
	await api(page.request, "links.add", {
		title: "Alpha second",
		url: "https://example.com/a",
	});
	let releaseScripts!: () => void;
	const scriptsReady = new Promise<void>((resolve) => {
		releaseScripts = resolve;
	});
	await page.route("**/*", async (route) => {
		if (route.request().resourceType() === "script") await scriptsReady;
		await route.continue();
	});
	try {
		await page.goto("/dashboard", { waitUntil: "commit" });
		for (const label of [
			"Search links",
			"Sort links",
			"Filter links by status",
			"Filter links by section",
		])
			await expect(page.getByLabel(label, { exact: true })).toBeDisabled();
		await expect(
			page.getByRole("button", { name: "Show live", exact: true }),
		).toBeDisabled();
	} finally {
		releaseScripts();
	}
	const sort = page.getByLabel("Sort links", { exact: true });
	await expect(sort).toBeEnabled();
	await sort.selectOption("az");
	await expect(
		page.locator("span").filter({ hasText: /^(Zulu first|Alpha second)$/ }),
	).toHaveText(["Alpha second", "Zulu first"]);
	await page.getByRole("button", { name: "Show paused", exact: true }).click();
	await expect(
		page.getByLabel("Filter links by status", { exact: true }),
	).toHaveValue("paused");
});
