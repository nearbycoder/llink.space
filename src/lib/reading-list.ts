export function readSavedLinks(
	raw: string | null,
	visibleIds: readonly string[],
): string[] {
	try {
		const value: unknown = JSON.parse(raw ?? "[]");
		if (!Array.isArray(value)) return [];
		const visible = new Set(visibleIds);
		return [
			...new Set(
				value.filter(
					(id): id is string => typeof id === "string" && visible.has(id),
				),
			),
		].slice(0, 500);
	} catch {
		return [];
	}
}
export function readingListKey(profileId: string) {
	return `llink.reading-list.${profileId}`;
}
