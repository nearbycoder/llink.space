import { z } from "zod";
export const linkViewSchema = z.object({
	name: z.string().trim().min(1).max(40),
	query: z.string().max(500),
	status: z.enum(["all", "live", "paused", "scheduled", "expired"]),
	sectionId: z.string().max(100),
});
export type LinkView = z.infer<typeof linkViewSchema>;
export function readLinkViews(value: string | null): LinkView[] {
	try {
		return z
			.array(linkViewSchema)
			.max(10)
			.parse(JSON.parse(value ?? "[]"));
	} catch {
		return [];
	}
}
