import { expect, test } from "@playwright/test";
import { api, setupCreator } from "./feature-helpers";

test("compact bookmarks support hover and keyboard without opening the destination", async ({
	page,
}) => {
	const { username } = await setupCreator(page);
	await api(page.request, "links.add", {
		title: "A useful essay",
		url: "https://example.com/essay",
	});
	await page.goto("/u/" + username);
	const save = page.getByRole("button", {
		name: "Save A useful essay for later",
		exact: true,
	});
	await expect(save).toBeEnabled();
	await page.mouse.move(0, 0);
	await expect(save).toHaveCSS("opacity", "0");
	const card = page.locator(".public-link-card");
	await card.hover();
	await expect(save).toHaveCSS("opacity", "1");
	expect((await card.boundingBox())!.height).toBeLessThan(90);
	await page.mouse.move(0, 0);
	await save.focus();
	await expect(save).toHaveCSS("opacity", "1");
	await page.keyboard.press("Space");
	await expect(save).toHaveAttribute("aria-pressed", "true");
	expect(page.context().pages()).toHaveLength(1);
	await expect(page).toHaveURL("/u/" + username);
	await page
		.getByRole("button", { name: "Saved links · 1", exact: true })
		.click();
	const dialog = page.getByRole("dialog", { name: "Your saved links" });
	await expect(dialog.getByText(/stays in this browser/)).toBeVisible();
	await expect(
		dialog.getByRole("link", { name: "A useful essay", exact: true }),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(dialog).toHaveCount(0);
	await expect(
		page.getByRole("button", { name: "Saved links · 1", exact: true }),
	).toBeFocused();
});

test.describe("touch profile", () => {
	test.use({
		viewport: { width: 390, height: 844 },
		hasTouch: true,
		isMobile: true,
	});
	test("bookmarks stay discoverable on touch and the saved-links dialog locks background scroll", async ({
		page,
	}) => {
		const { username } = await setupCreator(page);
		for (let i = 0; i < 8; i++)
			await api(page.request, "links.add", {
				title: `Link ${i}`,
				url: `https://example.com/${i}`,
			});
		await page.goto("/u/" + username);
		const save = page.getByRole("button", {
			name: "Save Link 0 for later",
			exact: true,
		});
		await expect(save).toBeEnabled();
		await expect(save).toHaveCSS("opacity", "0.65");
		const bounds = await save.boundingBox();
		expect(bounds!.width).toBeGreaterThanOrEqual(44);
		expect(bounds!.height).toBeGreaterThanOrEqual(44);
		await save.tap();
		await page
			.getByRole("button", { name: "Saved links · 1", exact: true })
			.tap();
		const y = await page.evaluate(() => scrollY);
		await page.mouse.move(5, 400);
		await page.mouse.wheel(0, 700);
		await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
		expect(await page.evaluate(() => scrollY)).toBe(y);
		await page
			.getByRole("dialog")
			.getByRole("button", { name: "Close", exact: true })
			.tap();
		await expect(page.getByRole("dialog")).toHaveCount(0);
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth,
			),
		).toBe(true);
	});
});
