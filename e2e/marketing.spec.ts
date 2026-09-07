import { expect, test } from "@playwright/test";
import { featureGroups } from "../src/components/marketing/features";
import demo from "../src/components/marketing/demo-chapters.json" with {
	type: "json",
};

test("marketing guide includes all 20 new features and filters by category", async ({
	page,
}) => {
	await page.goto("/");
	await expect(
		page.getByRole("link", { name: "Sign in", exact: true }),
	).toBeVisible();
	const headings = page.locator(".marketing-feature-group h4");
	await expect(headings).toHaveCount(20);
	for (const group of featureGroups)
		for (const feature of group.features)
			await expect(
				page.getByRole("heading", { name: feature.name, exact: true }),
			).toBeVisible();
	await page
		.getByRole("button", { name: "Make it yours 6", exact: true })
		.click();
	await expect(headings).toHaveCount(6);
	await expect(
		page.getByRole("heading", { name: "Event blocks", exact: true }),
	).toBeVisible();
	await page
		.getByRole("button", { name: "Everything 20", exact: true })
		.click();
	await expect(headings).toHaveCount(20);
	await page
		.getByText("Do saved views and reading lists sync between devices?", {
			exact: true,
		})
		.click();
	await expect(
		page.getByText("No. Named dashboard filters", { exact: false }),
	).toBeVisible();
});

test("recorded demo waits for playback and chapter buttons seek the real video", async ({
	page,
}) => {
	const mediaRequests: string[] = [];
	page.on("request", (request) => {
		if (request.url().endsWith("/api/demo-video"))
			mediaRequests.push(request.url());
	});
	await page.goto("/");
	await expect(
		page.getByRole("link", { name: "Sign in", exact: true }),
	).toBeVisible();
	const video = page.locator("video");
	await expect(video).toHaveAttribute("preload", "none");
	expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
	expect(mediaRequests).toHaveLength(0);
	await page
		.getByRole("button", { name: "Watch the product tour", exact: false })
		.click();
	await expect
		.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
		.toBeGreaterThan(0);
	await expect
		.poll(() => video.evaluate((v: HTMLVideoElement) => v.videoWidth))
		.toBe(1280);
	const chapter = demo.chapters[2];
	await page.getByRole("button", { name: new RegExp(chapter.title) }).click();
	await expect
		.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
		.toBeGreaterThanOrEqual(chapter.time);
	await video.evaluate((v: HTMLVideoElement) => v.pause());
	await expect(video).toHaveAttribute("controls", "");
	await page.getByText("Read the walkthrough", { exact: true }).click();
	await expect(page.locator(".marketing-transcript li")).toHaveCount(4);
	const captions = await page.request.get("/demo/product-tour.vtt");
	expect(captions.ok()).toBe(true);
	expect(await captions.text()).toContain("WEBVTT");
});

test("marketing page remains readable on mobile and respects reduced motion", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("/");
	await expect(
		page.getByRole("link", { name: "Sign in", exact: true }),
	).toBeVisible();
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"ONE LINK.",
	);
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth,
		),
	).toBe(true);
	expect(
		await page
			.locator(".marketing-hero-copy")
			.evaluate((el) => getComputedStyle(el).animationName),
	).toBe("none");
	await page
		.getByRole("link", { name: "See it in action", exact: true })
		.click();
	await expect(page).toHaveURL(/#demo$/);
	await expect(
		page.getByRole("heading", { name: "See it come together.", exact: true }),
	).toBeVisible();
	await page
		.getByRole("button", { name: "Take it everywhere 4", exact: true })
		.click();
	await expect(page.locator(".marketing-feature-group h4")).toHaveCount(4);
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth,
		),
	).toBe(true);
});
