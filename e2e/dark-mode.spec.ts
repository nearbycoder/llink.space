import { expect, test } from "@playwright/test";
import { setupCreator } from "./feature-helpers";

const isDark = (page: import("@playwright/test").Page) =>
	page.evaluate(() => document.documentElement.classList.contains("dark"));
const canvas = (page: import("@playwright/test").Page) =>
	page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test("marketing toggle switches to dark, persists without a flash, and follows the system by default", async ({
	page,
}) => {
	await page.emulateMedia({ colorScheme: "light" });
	await page.goto("/");
	const toggle = page.getByRole("button", { name: "Switch to dark mode" });
	await expect(toggle).toBeEnabled();
	expect(await isDark(page)).toBe(false);
	await toggle.click();
	expect(await isDark(page)).toBe(true);
	expect(await canvas(page)).toBe("rgb(18, 17, 16)");
	await expect(
		page.getByRole("button", { name: "Switch to light mode" }),
	).toBeVisible();

	// The saved choice is applied by the inline script before the page paints.
	await page.addInitScript(() => {
		document.addEventListener("DOMContentLoaded", () => {
			(window as unknown as { darkAtLoad: boolean }).darkAtLoad =
				document.documentElement.classList.contains("dark");
		});
	});
	await page.reload();
	expect(
		await page.evaluate(
			() => (window as unknown as { darkAtLoad: boolean }).darkAtLoad,
		),
	).toBe(true);

	await page.getByRole("button", { name: "System theme" }).click();
	expect(await isDark(page)).toBe(false);
	await page.emulateMedia({ colorScheme: "dark" });
	await expect.poll(() => isDark(page)).toBe(true);
});

test("dashboard switcher applies dark mode while creator pages keep their own theme", async ({
	page,
}) => {
	const { username } = await setupCreator(page);
	await page.goto("/dashboard");
	const sidebar = page.getByRole("complementary");
	await expect(
		sidebar.getByRole("button", { name: "Dark theme" }),
	).toBeEnabled();
	await sidebar.getByRole("button", { name: "Dark theme" }).click();
	await expect(
		sidebar.getByRole("button", { name: "Dark theme" }),
	).toHaveAttribute("aria-pressed", "true");
	expect(await canvas(page)).toBe("rgb(18, 17, 16)");

	await page.goto(`/u/${username}`);
	expect(await isDark(page)).toBe(true);
	// Creator pages ignore the app theme: tokens stay light.
	expect(
		await page.evaluate(() =>
			getComputedStyle(document.documentElement)
				.getPropertyValue("--card")
				.trim(),
		),
	).toBe("#ffffff");
	expect(await canvas(page)).not.toBe("rgb(18, 17, 16)");
});
