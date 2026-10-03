import { z } from "zod";
import { cleanLinkUrl } from "./clean-link-url";
import { LINK_ICON_KEYS } from "./link-icon-keys";
import { validSchedule } from "./link-publishing";
import { normalizeHttpUrl } from "./security";

export const batchOperationSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("duplicate") }),
	z
		.object({
			kind: z.literal("schedule"),
			publishAt: z.string().datetime().nullable(),
			expireAt: z.string().datetime().nullable(),
			activate: z.boolean(),
		})
		.refine(validSchedule, "End time must be after publish time"),
	z.object({
		kind: z.literal("description"),
		description: z.string().max(200),
	}),
	z.object({
		kind: z.literal("style"),
		iconUrl: z.enum(LINK_ICON_KEYS).nullable(),
		iconBgColor: z.string().regex(/^#[\da-f]{6}$/i),
	}),
	z.object({
		kind: z.literal("title"),
		find: z.string().min(1).max(100),
		replacement: z.string().max(100),
	}),
	z.object({
		kind: z.literal("url"),
		find: z.string().min(1).max(2048),
		replacement: z.string().max(2048),
	}),
	z.object({ kind: z.literal("clean") }),
]);
export type BatchOperation = z.infer<typeof batchOperationSchema>;
export const BATCH_TOOL_LABELS: Record<BatchOperation["kind"], string> = {
	duplicate: "Duplicate as drafts",
	schedule: "Schedule links",
	description: "Edit descriptions",
	style: "Style link icons",
	title: "Find & replace titles",
	url: "Find & replace URLs",
	clean: "Remove tracking parameters",
};
export interface BatchLink {
	id: string;
	title: string;
	url: string;
	description: string | null;
	iconUrl: string | null;
	iconBgColor: string | null;
	isActive: boolean | null;
	publishAt: string | null;
	expireAt: string | null;
}
export type BatchPatch = Partial<Omit<BatchLink, "id" | "iconBgColor">> & {
	iconBgColor?: string;
};
export function batchLinkPatch(
	link: BatchLink,
	operation: BatchOperation,
): BatchPatch {
	switch (operation.kind) {
		case "duplicate":
			return {
				title: `${link.title.slice(0, 93)} (copy)`,
				isActive: false,
				publishAt: null,
				expireAt: null,
			};
		case "schedule":
			return {
				publishAt: operation.publishAt,
				expireAt: operation.expireAt,
				...(operation.activate ? { isActive: true } : {}),
			};
		case "description":
			return { description: operation.description || null };
		case "style":
			return { iconUrl: operation.iconUrl, iconBgColor: operation.iconBgColor };
		case "title": {
			const title = link.title
				.split(operation.find)
				.join(operation.replacement)
				.trim();
			if (!title || title.length > 100)
				throw new Error(
					`“${link.title}” would have an empty title or exceed 100 characters.`,
				);
			return { title };
		}
		case "url": {
			const url = normalizeHttpUrl(
				link.url.split(operation.find).join(operation.replacement),
			);
			if (!url || url.length > 2048)
				throw new Error(`“${link.title}” would have an invalid destination.`);
			return { url };
		}
		case "clean": {
			const cleaned = cleanLinkUrl(link.url);
			if (!cleaned)
				throw new Error(`“${link.title}” has an invalid destination.`);
			return { url: cleaned.url };
		}
	}
}
export function previewBatchLinks<T extends BatchLink>(
	links: T[],
	operation: BatchOperation,
) {
	const parsed = batchOperationSchema.parse(operation);
	return links.map((link) => {
		const patch = batchLinkPatch(link, parsed);
		const changed =
			parsed.kind === "duplicate" ||
			Object.entries(patch).some(
				([key, value]) => link[key as keyof BatchLink] !== value,
			);
		return { before: link, after: { ...link, ...patch }, patch, changed };
	});
}
