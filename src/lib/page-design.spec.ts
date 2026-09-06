import { describe, expect, it } from "vitest";
import { blocksSchema, videoEmbedUrl } from "./page-design";

describe("page content", () => {
	it("only embeds known video providers with valid video IDs", () => {
		expect(videoEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
			"https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
		);
		expect(videoEmbedUrl("https://vimeo.com/12345")).toBe(
			"https://player.vimeo.com/video/12345",
		);
		for (const url of [
			"javascript:alert(1)",
			"https://youtube.com.attacker.test/watch?v=dQw4w9WgXcQ",
			"https://youtube.com/watch?v=<script>",
			"http://localhost/video",
		])
			expect(videoEmbedUrl(url)).toBeNull();
	});
	it("requires useful text, safe media, and unique block IDs", () => {
		const block = {
			id: "a32c8f73-0639-4bba-973c-f79f646fd750",
			type: "text",
			title: "Hello",
			body: "",
			url: "",
			afterLinkId: null,
		};
		expect(blocksSchema.safeParse([block]).success).toBe(true);
		expect(blocksSchema.safeParse([block, block]).success).toBe(false);
		expect(blocksSchema.safeParse([{ ...block, title: "" }]).success).toBe(
			false,
		);
		expect(
			blocksSchema.safeParse([
				{ ...block, type: "image", url: "data:text/html,hi" },
			]).success,
		).toBe(false);
		expect(
			blocksSchema.safeParse([
				{ ...block, type: "contact", url: "name@example.com" },
			]).success,
		).toBe(true);
	});
});
