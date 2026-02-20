import { expect, test } from "@playwright/test";

test("landing page renders primary content and nav actions", async ({ page }) => {
	await page.goto("/");

	await expect(page).toHaveTitle(/llink\.space/i);
	await expect(
		page.getByRole("heading", { name: "YOUR LINK-IN-BIO HOME BASE." }),
	).toBeVisible();
	await expect(page.getByRole("link", { name: "Create your page" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("unknown route renders not found experience", async ({ page }) => {
	await page.goto("/this-route-does-not-exist");

	await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Go home" })).toBeVisible();
});
