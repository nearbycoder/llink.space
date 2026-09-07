import { z } from "zod";
import { isAllowedAvatarUrl, normalizeHttpUrl } from "./security";
export const FONT_OPTIONS = {
	work: "'Work Sans', sans-serif",
	editorial: "Georgia, serif",
	mono: "'Courier New', monospace",
};
export const BUTTON_STYLES = ["rounded", "pill", "square"] as const;
export const BLOCK_TYPES = [
	"heading",
	"text",
	"image",
	"video",
	"contact",
	"faq",
	"quote",
] as const;
export function videoEmbedUrl(value: string) {
	const safe = normalizeHttpUrl(value);
	if (!safe) return null;
	const u = new URL(safe);
	let id: string | null = null;
	if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(u.hostname))
		id =
			u.searchParams.get("v") ??
			u.pathname.match(/^\/(?:shorts|embed)\/([\w-]{11})$/)?.[1] ??
			null;
	if (u.hostname === "youtu.be") id = u.pathname.slice(1);
	if (id && /^[\w-]{11}$/.test(id))
		return `https://www.youtube-nocookie.com/embed/${id}`;
	if (
		["vimeo.com", "www.vimeo.com"].includes(u.hostname) &&
		/^\/\d+$/.test(u.pathname)
	)
		return `https://player.vimeo.com/video${u.pathname}`;
	return null;
}
export const contentBlockSchema = z
	.object({
		id: z.string().uuid(),
		type: z.enum(BLOCK_TYPES),
		title: z.string().trim().max(100),
		body: z.string().max(2000),
		url: z.string().max(2048),
		afterLinkId: z.string().uuid().nullable(),
	})
	.superRefine((b, c) => {
		if (
			b.type === "quote" &&
			(!b.title || !b.body.trim() || (b.url && !normalizeHttpUrl(b.url)))
		)
			c.addIssue({
				code: "custom",
				message:
					"Quotes need attribution, quote text, and a valid source URL if provided",
			});
		if (b.type === "faq" && (!b.title || !b.body.trim()))
			c.addIssue({
				code: "custom",
				message: "FAQs need a question and an answer",
			});
		if (b.type === "image" && (!b.title || !isAllowedAvatarUrl(b.url)))
			c.addIssue({
				code: "custom",
				message: "Images need alt text and a valid image URL",
			});
		if (b.type === "video" && !videoEmbedUrl(b.url))
			c.addIssue({
				code: "custom",
				message: "Use a YouTube or Vimeo video URL",
			});
		if (b.type === "contact" && !z.email().safeParse(b.url).success)
			c.addIssue({ code: "custom", message: "Enter a valid contact email" });
		if (
			(b.type === "heading" || b.type === "text") &&
			!b.title &&
			!b.body.trim()
		)
			c.addIssue({ code: "custom", message: "Add a title or some text" });
	});
export type ContentBlock = z.infer<typeof contentBlockSchema>;
export const blocksSchema = z
	.array(contentBlockSchema)
	.max(30)
	.refine(
		(b) => new Set(b.map((x) => x.id)).size === b.length,
		"Block IDs must be unique",
	);
export const pageTemplates = [
	{
		id: "musician",
		name: "On repeat",
		audience: "Musicians",
		theme: "dark",
		heading: "The latest",
		body: "New sounds, upcoming shows, and everything in between.",
	},
	{
		id: "freelancer",
		name: "Selected work",
		audience: "Freelancers",
		theme: "slate",
		heading: "Let’s make something",
		body: "A selection of my work, ideas, and ways to get in touch.",
	},
	{
		id: "restaurant",
		name: "At the table",
		audience: "Restaurants",
		theme: "terracotta",
		heading: "Pull up a chair",
		body: "Good food and good company. Explore what’s happening at our table.",
	},
	{
		id: "event",
		name: "Save the date",
		audience: "Events",
		theme: "ocean",
		heading: "You’re invited",
		body: "Everything you need to plan your visit, all in one place.",
	},
] as const;
