import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import pg from "pg";
import sharp from "sharp";

// Run only against an isolated local database and app. Never use customer data.
const baseURL = process.env.DEMO_BASE_URL || "http://127.0.0.1:3069";
const databaseURL = process.env.DATABASE_URL;
const local = (url) =>
	["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname);
if (!databaseURL || !local(baseURL) || !local(databaseURL)) {
	throw new Error(
		"DEMO_BASE_URL and DATABASE_URL must both point to a local demo instance.",
	);
}
const work = await mkdtemp(path.join(os.tmpdir(), "llink-tour-"));
const assets = path.resolve("public/demo");
await mkdir(assets, { recursive: true });
const db = new pg.Client({ connectionString: databaseURL });
await db.connect();
const browser = await chromium.launch({ headless: true });
const setup = await browser.newContext({ baseURL });
const username = `studiofield-${Date.now().toString(36)}`;
const password = randomUUID() + "Aa1!";
const signup = await setup.request.post("/api/auth/sign-up/email", {
	data: { name: "Studio Field", email: `${username}@example.test`, password },
});
if (!signup.ok()) throw new Error(await signup.text());
async function api(name, json) {
	const r = await setup.request.post(`/api/trpc/${name}`, { data: { json } });
	if (!r.ok()) throw new Error(await r.text());
	return (await r.json()).result.data.json;
}
const profile = await api("profile.create", {
	username,
	displayName: "Studio Field",
});
const links = [];
for (const [title, slug, description, iconUrl, iconBgColor] of [
	[
		"The spring collection",
		"collection",
		"Objects made slowly. Made to stay.",
		"link-2",
		"#DDEBAF",
	],
	[
		"Notes from the studio",
		"journal",
		"Ideas, process, and work in progress.",
		"file-text",
		"#D6E8E3",
	],
	[
		"Work with us",
		"contact",
		"Good things start with a conversation.",
		"link-2",
		"#EADDD1",
	],
])
	links.push(
		await api("links.add", {
			title,
			url: `https://example.com/${slug}`,
			description,
			iconUrl,
			iconBgColor,
		}),
	);
await api("profile.update", {
	displayName: "Studio Field",
	bio: "Objects, stories, and other small obsessions. Independent design, made with care.",
	theme: "slate",
	pageBackgroundType: "theme",
	fontFamily: "work",
	buttonStyle: "rounded",
	contentBlocks: [
		{
			id: randomUUID(),
			type: "faq",
			title: "Do you take on custom projects?",
			body: "Yes. Tell us what you have in mind using the Work with us link.",
			url: "",
			afterLinkId: links[2].id,
		},
	],
});
// A reserved example hostname makes the QR fixture readable without a real DNS/provider call.
await db.query(
	"INSERT INTO custom_domains (profile_id, hostname, token, status) VALUES ($1, 'studiofield.example', $2, 'active')",
	[profile.id, randomUUID()],
);
await db.end();
const storageState = await setup.storageState();
await setup.close();
const chapters = [];
const captions = [];
let total = 0;
const vttTime = (seconds) =>
	new Date(Math.round(seconds * 1000)).toISOString().slice(11, 23);
const label = (seconds) =>
	`${Math.floor(seconds / 60)
		.toString()
		.padStart(2, "0")}:${Math.floor(seconds % 60)
		.toString()
		.padStart(2, "0")}`;
const pause = (page, seconds = 1.5) => page.waitForTimeout(seconds * 1000); // Intentional reading time in the recording.
const role = (page, name) => page.getByRole("button", { name, exact: true });
async function click(page, target) {
	await target.scrollIntoViewIfNeeded();
	const box = await target.boundingBox();
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
		steps: 16,
	});
	await pause(page, 0.35);
	await target.click();
	await pause(page, 1.3);
}
async function segment(title, description, url, ready, actions) {
	const context = await browser.newContext({
		baseURL,
		storageState,
		viewport: { width: 1280, height: 800 },
		recordVideo: { dir: work, size: { width: 1280, height: 800 } },
	});
	await context.addInitScript(() => {
		const style = document.createElement("style");
		style.textContent =
			'[data-testid="tanstack_devtools"] {display:none!important} html {scroll-behavior:auto!important}';
		document.addEventListener("DOMContentLoaded", () => {
			document.head.append(style);
			const cursor = document.createElement("div");
			cursor.style.cssText =
				"position:fixed;z-index:2147483647;pointer-events:none;width:22px;height:22px;border:2px solid #263b25;border-radius:50%;background:#ddebaf99;transform:translate(-50%,-50%);left:-100px;top:-100px";
			document.body.append(cursor);
			document.addEventListener("mousemove", (e) => {
				cursor.style.left = e.clientX + "px";
				cursor.style.top = e.clientY + "px";
			});
		});
	});
	const page = await context.newPage();
	const video = page.video();
	await page.goto(url);
	await ready(page);
	await page.evaluate(() => document.fonts.ready);
	await pause(page, 1);
	const started = performance.now();
	chapters.push({ title, description, time: total, label: label(total) });
	const cue = (text) =>
		captions.push({ time: total + (performance.now() - started) / 1000, text });
	await actions(page, cue);
	await pause(page, 1.5);
	const duration = Math.round(((performance.now() - started) / 1000) * 25) / 25;
	await context.close();
	const raw = await video.path();
	const rawDuration = Number(
		execFileSync(
			"ffprobe",
			[
				"-v",
				"error",
				"-show_entries",
				"format=duration",
				"-of",
				"default=noprint_wrappers=1:nokey=1",
				raw,
			],
			{ encoding: "utf8" },
		),
	);
	const output = path.join(work, `chapter-${chapters.length}.mp4`);
	execFileSync("ffmpeg", [
		"-y",
		"-v",
		"error",
		"-ss",
		String(Math.max(0, rawDuration - duration)),
		"-i",
		raw,
		"-t",
		String(duration),
		"-an",
		"-r",
		"25",
		"-c:v",
		"libx264",
		"-preset",
		"slow",
		"-crf",
		"20",
		"-pix_fmt",
		"yuv420p",
		"-movflags",
		"+faststart",
		output,
	]);
	total = Math.round((total + duration) * 100) / 100;
	console.log(`${title}: ${duration.toFixed(2)}s`);
}
try {
	await segment(
		"Shape your page",
		"Choose a theme in Design studio and see it in the live preview. Undo and redo draft changes, then publish when you are ready.",
		"/dashboard/design",
		async (p) => {
			await expect(p.getByLabel("Theme", { exact: true })).toBeEnabled();
			await p.getByLabel("Theme", { exact: true }).scrollIntoViewIfNeeded();
		},
		async (p, cue) => {
			cue("Choose a theme. See your changes in the live preview.");
			await pause(p, 1.5);
			await p.getByLabel("Theme", { exact: true }).selectOption("ocean");
			await pause(p, 2);
			cue("Undo and redo while your changes are still a draft.");
			await click(p, role(p, "Undo change"));
			await click(p, role(p, "Redo change"));
			cue("Publish when your page feels right.");
			await click(p, role(p, "Publish design"));
			await expect(
				p.getByText("Live preview · Published", { exact: true }),
			).toBeVisible();
		},
	);
	await segment(
		"Organize your links",
		"Find a link with search, sort the dashboard, and open the editor to refine its title and destination. These management tools keep your public page order intact.",
		"/dashboard",
		async (p) => await expect(role(p, "Add link")).toBeEnabled(),
		async (p, cue) => {
			cue("Find the link you need with a quick search.");
			await pause(p, 1);
			await p
				.getByRole("textbox", { name: "Search links", exact: true })
				.pressSequentially("studio", { delay: 100 });
			await pause(p, 1.8);
			await click(p, role(p, "Clear search"));
			cue("Sort your workspace without changing the public page order.");
			await p.getByLabel("Sort links").selectOption("az");
			await pause(p, 2);
			cue("Open a link to refine its title, destination, or description.");
			await click(p, role(p, "Edit Notes from the studio"));
			await pause(p, 2);
		},
	);
	await segment(
		"Make it worth a visit",
		"Explore the published page. Save a link for later, open your saved links, and expand an FAQ answer. Saved links stay in the visitor’s browser.",
		`/u/${username}`,
		async (p) =>
			await expect(
				role(p, "Save The spring collection for later"),
			).toBeEnabled(),
		async (p, cue) => {
			cue("A clean page for your work, ideas, and next big thing.");
			await pause(p, 1.5);
			cue("Bookmark a link to revisit later in this browser.");
			await p.locator(".public-link-card").first().hover();
			await click(p, role(p, "Save The spring collection for later"));
			await click(p, role(p, "Saved links · 1"));
			await pause(p, 1.8);
			await click(
				p,
				p
					.getByRole("dialog")
					.getByRole("button", { name: "Close", exact: true }),
			);
			cue("Give visitors helpful answers right on your page.");
			await click(
				p,
				p.getByText("Do you take on custom projects?", { exact: true }),
			);
		},
	);
	await segment(
		"Share with a scan",
		"Open the QR share kit and download an SVG for posters, packaging, or business cards. A PNG download is available too.",
		`/u/${username}`,
		async (p) => await expect(role(p, "QR code")).toBeEnabled(),
		async (p, cue) => {
			cue("Turn your page into a QR code, ready to share.");
			await click(p, role(p, "QR code"));
			await expect(role(p, "Download SVG")).toBeEnabled();
			await pause(p, 2);
			cue("Download a crisp SVG or PNG. No extra service needed.");
			const download = p.waitForEvent("download");
			await click(p, role(p, "Download SVG"));
			await (await download).saveAs(path.join(work, "sample-qr.svg"));
			await pause(p, 1.5);
		},
	);
	const list = path.join(work, "concat.txt");
	await writeFile(
		list,
		chapters
			.map((_, i) => `file '${path.join(work, `chapter-${i + 1}.mp4`)}'`)
			.join("\n"),
	);
	execFileSync("ffmpeg", [
		"-y",
		"-v",
		"error",
		"-f",
		"concat",
		"-safe",
		"0",
		"-i",
		list,
		"-c",
		"copy",
		"-movflags",
		"+faststart",
		path.join(assets, "product-tour.mp4"),
	]);
	const poster = path.join(work, "poster.png");
	execFileSync("ffmpeg", [
		"-y",
		"-v",
		"error",
		"-ss",
		"6",
		"-i",
		path.join(assets, "product-tour.mp4"),
		"-frames:v",
		"1",
		poster,
	]);
	await sharp(poster)
		.webp({ quality: 92 })
		.toFile(path.join(assets, "product-tour-poster.webp"));
	await writeFile(
		"src/components/marketing/demo-chapters.json",
		JSON.stringify(
			{
				version: createHash("sha256")
					.update(await readFile(path.join(assets, "product-tour.mp4")))
					.digest("hex")
					.slice(0, 12),
				durationLabel: `${Math.round(total)} sec`,
				chapters,
			},
			null,
			"\t",
		) + "\n",
	);
	await writeFile(
		path.join(assets, "product-tour.vtt"),
		"WEBVTT\n\n" +
			captions
				.map(
					(c, i) =>
						`${vttTime(c.time)} --> ${vttTime(captions[i + 1]?.time ?? total)}\n${c.text}\n`,
				)
				.join("\n"),
	);
	console.log(
		`Recorded ${total.toFixed(2)} seconds. Review assets and clips in ${work}`,
	);
} finally {
	await browser.close();
}
