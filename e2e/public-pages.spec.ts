import { expect, test } from "@playwright/test";

test("landing page renders primary content and nav actions", async ({ page }) => {
	const response = await page.goto("/");
	expect(response?.headers()["x-frame-options"]).toBe("DENY");
	expect(response?.headers()["x-content-type-options"]).toBe("nosniff");

	await expect(page).toHaveTitle(/llink\.space/i);
	await expect(
		page.getByRole("heading", { level: 1, name: /ONE LINK.*A WHOLE LOT.*OF YOU/ }),
	).toBeVisible();
	await expect(page.getByRole("link", { name: "Create your page" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible({
		timeout: 15_000,
	});
});

test("cross-origin API writes are rejected", async ({ request }) => {
	const response = await request.post("/api/trpc/security-probe", {
		headers: { origin: "https://attacker.example" },
		data: {},
	});

	expect(response.status()).toBe(403);
	expect(await response.json()).toEqual({ error: "Invalid request origin" });
});

test("unknown route renders not found experience", async ({ page }) => {
	await page.goto("/this-route-does-not-exist");

	await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Go home" })).toBeVisible();
});
