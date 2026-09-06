export interface ObjectReadOptions {
	ifNoneMatch?: string;
	ifModifiedSince?: Date;
	head?: boolean;
	signal?: AbortSignal;
}

export function objectNotModified(
	options: ObjectReadOptions,
	etag: string | null,
	modified: Date | null,
) {
	if (options.ifNoneMatch !== undefined) {
		return options.ifNoneMatch.split(",").some((candidate) => {
			const tag = candidate.trim();
			return (
				tag === "*" ||
				(etag !== null && tag.replace(/^W\//, "") === etag.replace(/^W\//, ""))
			);
		});
	}
	return !!(
		options.ifModifiedSince &&
		modified &&
		Math.floor(modified.getTime() / 1000) <=
			Math.floor(options.ifModifiedSince.getTime() / 1000)
	);
}

export function objectReadOptions(request: Request): ObjectReadOptions {
	const modified = request.headers.get("if-modified-since");
	const date = modified ? new Date(modified) : undefined;
	return {
		ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
		ifModifiedSince: date && Number.isFinite(date.getTime()) ? date : undefined,
		head: request.method === "HEAD",
		signal: request.signal,
	};
}
