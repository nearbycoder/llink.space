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
	await page.addInitScript(() => {
		Object.defineProperty(navigator, "share", {
			configurable: true,
			value: undefined,
		});
	});

	await page.goto("/sign-up");
	const createAccountButton = page.getByRole("button", {
		name: "Create account",
	});
	// A cold CI dev server compiles this route on the first visit.
	await expect(createAccountButton).toBeEnabled({ timeout: 15_000 });
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
	await expect(page.getByText("14/100")).toBeVisible();
	await page.getByLabel("URL").fill("example.com/portfolio");
	await expect(
		page.getByText("HTTPS is added automatically when you omit it."),
	).toBeVisible();
	await page.getByRole("button", { name: "Section", exact: true }).click();
	await page.getByRole("option", { name: "Featured" }).click();
	await page
		.getByLabel("Description (optional)")
		.fill("A portfolio created by the full journey test");
	await expect(page.getByText("44/200")).toBeVisible();
	await page.getByRole("button", { name: "Select Website icon" }).click();
	await page.getByRole("button", { name: "Add link", exact: true }).click();
	await expect(page.getByText("Link added")).toBeVisible();
	await expect(page.getByText("Test portfolio", { exact: true })).toBeVisible();
	await expect(page.getByTestId("link-stat-total")).toContainText("1");
	await expect(page.getByTestId("link-stat-live")).toContainText("1");

	await page.getByRole("textbox", { name: "Search links" }).fill("portfolio");
	await expect(page.getByText("Showing 1 of 1 links")).toBeVisible();
	await page.getByLabel("Filter links by status").selectOption("live");
	await page.getByLabel("Filter links by section").selectOption({ label: "Featured" });
	await expect(page.getByText("Test portfolio", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Clear filters" }).click();

	await page.getByRole("button", { name: "Copy page URL" }).click();
	await expect(page.getByText("Public page URL copied")).toBeVisible();

	await page.getByText("Test portfolio", { exact: true }).hover();
	await page.getByRole("button", { name: "Pause Test portfolio" }).click();
	await expect(page.getByText("Link paused")).toBeVisible();
	await expect(page.locator('[data-slot="badge"]').getByText("Paused", { exact: true })).toBeVisible();
	await page.getByLabel("Filter links by status").selectOption("paused");
	await expect(page.getByText("Showing 1 of 1 links")).toBeVisible();
	await page.getByRole("button", { name: "Clear filters" }).click();

	await page.getByText("Test portfolio", { exact: true }).hover();
	await page.getByRole("button", { name: "Duplicate Test portfolio" }).click();
	await expect(page.getByText("Link duplicated")).toBeVisible();
	await expect(page.getByText("Test portfolio copy", { exact: true })).toBeVisible();
	await expect(page.getByTestId("link-stat-total")).toContainText("2");
	await expect(page.getByTestId("link-stat-paused")).toContainText("2");

	await page.getByText("Test portfolio", { exact: true }).hover();
	await page
		.getByRole("button", { name: "Publish Test portfolio", exact: true })
		.click();
	await expect(page.getByText("Link published")).toBeVisible();
	await expect(page.getByTestId("link-stat-live")).toContainText("1");
	await expect(page.getByTestId("link-stat-paused")).toContainText("1");

	const linksDownloadPromise = page.waitForEvent("download");
	await page.getByRole("button", { name: "Export links" }).click();
	const linksDownload = await linksDownloadPromise;
	expect(linksDownload.suggestedFilename()).toMatch(
		/^llink-links-\d{4}-\d{2}-\d{2}\.csv$/,
	);

	await page.getByRole("button", { name: "Select", exact: true }).click();
	await page.getByRole("button", { name: "Select visible (2)" }).click();
	await expect(page.getByText("2 selected")).toBeVisible();
	await page.getByRole("button", { name: "Pause", exact: true }).click();
	await expect(page.getByText("2 links paused")).toBeVisible();
	await expect(page.getByTestId("link-stat-paused")).toContainText("2");

	await page.getByRole("button", { name: "Select visible (2)" }).click();
	await page.getByRole("button", { name: "Publish", exact: true }).click();
	await expect(page.getByText("2 links published")).toBeVisible();
	await expect(page.getByTestId("link-stat-live")).toContainText("2");

	await page.getByLabel("Select Test portfolio copy").check();
	await page.getByLabel("Bulk move destination").selectOption("unsectioned");
	await page.getByRole("button", { name: "Move", exact: true }).click();
	await expect(page.getByText("1 link moved")).toBeVisible();
	await page.getByLabel("Select Test portfolio copy").check();
	await page.getByRole("button", { name: "Delete", exact: true }).click();
	await page.getByRole("button", { name: "Delete selected" }).click();
	await expect(page.getByText("1 link deleted")).toBeVisible();
	await expect(page.getByText("Test portfolio copy", { exact: true })).toHaveCount(
		0,
	);
	await page.getByRole("button", { name: "Done", exact: true }).click();

	await page.getByText("Test portfolio", { exact: true }).hover();
	await page
		.getByRole("button", { name: "Edit Test portfolio", exact: true })
		.click();
	await page.getByLabel("Title").fill("Creator portfolio");
	await page.getByRole("button", { name: "Save", exact: true }).click();
	await expect(page.getByText("Link updated")).toBeVisible();
	await expect(page.getByText("Creator portfolio", { exact: true })).toBeVisible();

	await page.reload();
	await expect(page.getByRole("heading", { name: "Links" })).toBeVisible();
	await expect(page.getByText("Creator portfolio", { exact: true })).toBeVisible();

	await page.getByRole("link", { name: "Profile" }).click();
	await expect(page.getByTestId("profile-form")).toHaveAttribute(
		"aria-busy",
		"false",
	);
	await expect(page.getByText("0/300")).toBeVisible();
	await page.getByLabel("New password", { exact: true }).fill("UnsavedPassword123!");
	page.once("dialog", (dialog) => dialog.accept());
	await page.getByRole("link", { name: "Links", exact: true }).click();
	await expect(page).toHaveURL(/\/dashboard$/);
	await page.getByRole("link", { name: "Profile", exact: true }).click();
	await expect(page.getByLabel("New password", { exact: true })).toHaveValue("");

	await page.getByLabel("Display name").fill("Temporary name");
	page.once("dialog", (dialog) => dialog.dismiss());
	await page.getByRole("link", { name: "Links", exact: true }).click();
	await expect(page).toHaveURL(/\/dashboard\/profile$/);
	await expect(page.getByLabel("Display name")).toHaveValue("Temporary name");
	page.once("dialog", (dialog) => dialog.dismiss());
	await page.getByRole("button", { name: "Sign out", exact: true }).click();
	await expect(page).toHaveURL(/\/dashboard\/profile$/);
	const sessionAfterCancel = await page.request.get("/api/auth/get-session");
	expect((await sessionAfterCancel.json())?.user?.email).toBe(email);
	expect(await page.evaluate(() => !window.dispatchEvent(new Event("beforeunload", { cancelable: true })))).toBe(true);

	await expect(page.getByText("Unsaved changes")).toBeVisible();
	await page.getByRole("button", { name: "Discard changes" }).click();
	await expect(page.getByLabel("Display name")).toHaveValue("Journey Creator");
	await page.getByLabel("Display name").fill("Journey Studio");
	await page
		.getByLabel("Bio")
		.fill("Design systems, useful experiments, and practical resources.");
	await expect(page.getByText("60/300")).toBeVisible();
	await page.getByLabel("Avatar").setInputFiles(imagePath);
	await expect(page.getByText(/Avatar uploaded/)).toBeVisible();
	await page.getByRole("button", { name: "Custom image" }).click();
	await page.getByLabel("Page background").setInputFiles(imagePath);
	await expect(page.getByText(/Background uploaded/)).toBeVisible();
	await page.getByRole("button", { name: "Save changes" }).click();
	await expect(page.getByText("Profile published")).toBeVisible();

	await page.reload();
	await expect(page.getByLabel("Display name")).toHaveValue("Journey Studio");
	await expect(page.getByLabel("Bio")).toHaveValue(
		"Design systems, useful experiments, and practical resources.",
	);

	await page.goto(`/u/${username}`);
	await expect(page.getByRole("heading", { name: "Journey Studio" })).toBeVisible();
	await expect(
		page.getByText("Design systems, useful experiments, and practical resources."),
	).toBeVisible();
	await expect(page.getByRole("link", { name: /Creator portfolio/ })).toBeVisible();
	await expect(page.getByAltText("Journey Studio avatar")).toBeVisible();
	await page.getByRole("button", { name: "Share profile" }).click();
	await expect(page.getByRole("button", { name: "Share profile" })).toContainText(
		"Link copied",
	);

	await page.getByRole("button", { name: "Search links", exact: true }).click();
	await page.getByRole("textbox", { name: "Search links" }).fill("portfolio");
	await expect(page.getByRole("button", { name: /Creator portfolio/ })).toBeVisible();
	await page.keyboard.press("Escape");

	const popupPromise = page.waitForEvent("popup");
	await page.getByRole("link", { name: /Creator portfolio/ }).click();
	const popup = await popupPromise;
	await popup.close();

	await page.goto("/dashboard/analytics");
	await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
	const downloadPromise = page.waitForEvent("download");
	await page.getByRole("button", { name: "Export CSV" }).click();
	const download = await downloadPromise;
	expect(download.suggestedFilename()).toMatch(/^llink-analytics-\d{4}-\d{2}-\d{2}\.csv$/);
	await expect(page.getByText("Total clicks").locator("../..")).toContainText(
		"1",
	);
	await page.getByRole("button", { name: "30d" }).click();
	await expect(page.getByRole("button", { name: "30d" })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	await expect(
		page.getByText("Last 30 days", { exact: true }).locator("../.."),
	).toContainText("1");
	await page.getByRole("button", { name: "90d" }).click();
	await expect(page.getByText("Clicks trend (90 days)")).toBeVisible();
	await expect(page).toHaveURL(/days=90/);
	await page.reload();
	await expect(page.getByRole("button", { name: "90d" })).toHaveAttribute("aria-pressed", "true");
	await expect(page.getByText("Total clicks").locator("../..")).toContainText(
		"1",
	);

	await page.getByRole("link", { name: "Profile" }).click();
	await expect(page.getByTestId("profile-form")).toHaveAttribute(
		"aria-busy",
		"false",
	);
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
	await page.getByRole("button", { name: "Import links", exact: true }).click();
	await page.getByLabel("Website URLs").fill("javascript:alert(1)");
	await expect(page.getByRole("button", { name: "Import as drafts" })).toBeDisabled();
	await page.getByLabel("Website URLs").fill("example.com/import-one\tImported portfolio\nexample.com/import-two\nhttps://example.com/import-one");
	await expect(page.getByText("2 new links · 1 duplicates skipped")).toBeVisible();
	await page.getByRole("button", { name: "Import as drafts" }).click();
	await expect(page.getByText("2 links imported as drafts")).toBeVisible();
	await expect(page.getByTestId("link-stat-paused")).toContainText("2");
	await page.reload();
	await expect(page.getByText("Imported portfolio", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Import links", exact: true }).click();
	await page.getByLabel("Website URLs").fill("example.com/import-one");
	await expect(page.getByText("0 new links · 1 duplicates skipped")).toBeVisible();
	await expect(page.getByRole("button", { name: "Import as drafts" })).toBeDisabled();
	await page.getByRole("button", { name: "Cancel", exact: true }).click();
	await page.setViewportSize({ width: 390, height: 844 });
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.getByRole("button", { name: "Import links", exact: true }).click();
	await expect(page.getByRole("dialog")).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
	await page.screenshot({ path: "/tmp/llink-import-mobile.png", animations: "disabled" });
	await page.getByRole("button", { name: "Cancel", exact: true }).click();
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await page.screenshot({ path: "/tmp/llink-dashboard-mobile.png", animations: "disabled" });

});
