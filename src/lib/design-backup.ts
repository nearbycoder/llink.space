import { z } from "zod";
import { BUTTON_STYLES, blocksSchema } from "./page-design";
import { themes } from "./themes";
export const styleBackupSchema = z.object({
	version: z.literal(1),
	theme: z.string().refine((v) => Object.hasOwn(themes, v)),
	fontFamily: z.enum(["work", "editorial", "mono"]),
	buttonStyle: z.enum(BUTTON_STYLES),
	accentColor: z
		.string()
		.regex(/^#[\da-f]{6}$/i)
		.nullable(),
	contentBlocks: blocksSchema,
});
export type StyleBackup = z.infer<typeof styleBackupSchema>;
export function parseStyleBackup(text: string, linkIds: string[]) {
	if (new TextEncoder().encode(text).length > 262144)
		throw new Error("Choose a backup smaller than 256 KB.");
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		throw new Error("This file is not valid JSON.");
	}
	const parsed = styleBackupSchema.safeParse(value);
	if (!parsed.success)
		throw new Error(
			"This is not a supported style backup, or it contains invalid content.",
		);
	const ids = new Set(linkIds);
	return {
		...parsed.data,
		contentBlocks: parsed.data.contentBlocks.map((b) => ({
			...b,
			afterLinkId:
				b.afterLinkId && ids.has(b.afterLinkId) ? b.afterLinkId : null,
		})),
	};
}
