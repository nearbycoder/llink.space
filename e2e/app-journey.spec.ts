import { expect, test } from "@playwright/test";
import path from "node:path";

test("complete creator journey works end to end", async ({ page }) => {
	test.setTimeout(90_000);
	const runId = Date.now().toString(36).slice(-8);
	const username = `ui${runId}`;
	const email = `${username}@example.test`;
	const initialPassword = "JourneyPassword123!";
	const updatedPassword = "UpdatedJourney456!";
	const imagePath = path.resolve("public/android-chrome-192x192.png");

	await page.goto("/sign-up");
	const createAccountButton = page.getByRole("button", {
		name: "Create account",
	});
	await expect(createAccountButton).toBeEnabled();
	await page.getByLabel("Name").fill("Journey Creator");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(initialPassword);
	await createAccountButton.click();

	await expect(page).toHaveURL(/\/onboarding/);
	await page.getByLabel("Username").fill(username.toUpperCase());
	await expect(page.getByLabel("Username")).toHaveValue(username);
	await page.getByLabel("Display name").fill("Journey Creator");
	await expect(page.getByText("Username available!"), "username check").toBeVisible();
	await page.getByRole("button", { name: /Continue/ }).click();

	await expect(page).toHaveURL(/\/dashboard$/);
	await expect(page.getByRole("heading", { name: "Links" })).toBeVisible();

	await page.getByRole("button", { name: "Add section" }).click();
	await page.getByPlaceholder("Section title").fill("Featured");
	await page.getByRole("button", { name: "Create", exact: true }).click();
	await expect(page.getByText("Section created")).toBeVisible();
	await expect(page.getByRole("heading", { name: "Featured" })).toBeVisible();

	await page.getByRole("button", { name: "Add link" }).click();
	await page.getByLabel("Title").fill("Test portfolio");
	await page.getByLabel("URL").fill("https://example.com/portfolio");
	await page.getByRole("button", { name: "Section", exact: true }).click();
	await page.getByRole("option", { name: "Featured" }).click();
	await page
		.getByLabel("Description (optional)")
		.fill("A portfolio created by the full journey test");
	await page.getByRole("button", { name: "Select Website icon" }).click();
	await page.getByRole("button", { name: "Add link", exact: true }).click();
	await expect(page.getByText("Link added")).toBeVisible();
	await expect(page.getByText("Test portfolio", { exact: true })).toBeVisible();

	await page.getByText("Test portfolio", { exact: true }).hover();
	await page.getByRole("button", { name: "Edit Test portfolio" }).click();
	await page.getByLabel("Title").fill("Creator portfolio");
	await page.getByRole("button", { name: "Save", exact: true }).click();
	await expect(page.getByText("Link updated")).toBeVisible();
	await expect(page.getByText("Creator portfolio", { exact: true })).toBeVisible();

	await page.getByRole("link", { name: "Profile" }).click();
	await page.getByLabel("Display name").fill("Journey Studio");
	await page
		.getByLabel("Bio")
		.fill("Design systems, useful experiments, and practical resources.");
	await page.getByLabel("Avatar").setInputFiles(imagePath);
	await expect(page.getByText(/Avatar uploaded/)).toBeVisible();
	await page.getByRole("button", { name: "Custom image" }).click();
	await page.getByLabel("Page background").setInputFiles(imagePath);
	await expect(page.getByText(/Background uploaded/)).toBeVisible();
	await page.getByRole("button", { name: "Save changes" }).click();
	await expect(page.getByText("Profile published")).toBeVisible();

	await page.goto(`/u/${username}`);
	await expect(page.getByRole("heading", { name: "Journey Studio" })).toBeVisible();
	await expect(
		page.getByText("Design systems, useful experiments, and practical resources."),
	).toBeVisible();
	await expect(page.getByRole("link", { name: /Creator portfolio/ })).toBeVisible();
	await expect(page.getByAltText("Journey Studio avatar")).toBeVisible();

	await page.getByRole("button", { name: /Ctrl \+ K|Command \+ K/ }).click();
	await page.getByLabel("Search links").fill("portfolio");
	await expect(page.getByRole("button", { name: /Creator portfolio/ })).toBeVisible();
	await page.keyboard.press("Escape");

	const popupPromise = page.waitForEvent("popup");
	await page.getByRole("link", { name: /Creator portfolio/ }).click();
	const popup = await popupPromise;
	await popup.close();

	await page.goto("/dashboard/analytics");
	await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
	await expect(page.getByText("Total clicks").locator("../..")).toContainText(
		"1",
	);

	await page.getByRole("link", { name: "Profile" }).click();
	await page.getByLabel("Current password").fill(initialPassword);
	await page.getByLabel("New password", { exact: true }).fill(updatedPassword);
	await page.getByLabel("Confirm new password").fill(updatedPassword);
	await page.getByRole("button", { name: "Update password" }).click();
	await expect(page.getByText("Password updated successfully.")).toBeVisible();

	await page.getByRole("button", { name: "Sign out" }).click();
	await expect(page).toHaveURL(/\/sign-in$/);
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(updatedPassword);
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page).toHaveURL(/\/dashboard$/);
	await expect(page.getByText("Creator portfolio", { exact: true })).toBeVisible();

	await page.getByText("Creator portfolio", { exact: true }).hover();
	await page.getByRole("button", { name: "Delete Creator portfolio" }).click();
	await page.getByRole("button", { name: "Delete link" }).click();
	await expect(page.getByText("Link deleted")).toBeVisible();
	await expect(page.getByText("Creator portfolio", { exact: true })).toHaveCount(0);
});
