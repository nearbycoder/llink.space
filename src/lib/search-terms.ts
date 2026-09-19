/** Quoted phrases stay together; every term must match at least one field. */
export function searchTerms(query: string) {
	return [...query.toLocaleLowerCase().matchAll(/"([^"]*)"|([^\s"]+)/g)]
		.map((match) => (match[1] ?? match[2]).trim())
		.filter(Boolean);
}
export function matchesSearch(fields: string[], terms: string[]) {
	const normalized = fields.map((field) => field.toLocaleLowerCase());
	return terms.every((term) =>
		normalized.some((field) => field.includes(term)),
	);
}
