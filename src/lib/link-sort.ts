export const LINK_SORTS = {
	manual: "Page order",
	az: "Title A–Z",
	za: "Title Z–A",
	newest: "Newest first",
	oldest: "Oldest first",
};
export type LinkSort = keyof typeof LINK_SORTS;
export function sortDashboardView<
	T extends {
		id: string;
		title: string;
		sortOrder: number | null;
		createdAt?: Date | string | null;
	},
>(links: T[], mode: LinkSort): T[] {
	if (mode === "manual") return links;
	const time = (v: Date | string | null | undefined) =>
		v ? new Date(v).getTime() || 0 : 0;
	return [...links]
		.sort((a, b) => {
			const order =
				mode === "az" || mode === "za"
					? a.title.localeCompare(b.title, undefined, {
							sensitivity: "base",
							numeric: true,
						}) * (mode === "az" ? 1 : -1)
					: (time(a.createdAt) - time(b.createdAt)) *
						(mode === "oldest" ? 1 : -1);
			return order || a.id.localeCompare(b.id);
		})
		.map((link, index) => ({ ...link, sortOrder: index }));
}
