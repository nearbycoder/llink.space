export function normalizeHttpUrl(value: string): string | null {
	try {
		const url = new URL(value.trim());
		if (url.protocol !== "https:" && url.protocol !== "http:") {
			return null;
		}
		if (url.username || url.password) {
			return null;
		}
		return url.toString();
	} catch {
		return null;
	}
}

export function isSafeHttpUrl(value: string): boolean {
	return normalizeHttpUrl(value) !== null;
}

export function isAllowedAvatarUrl(value: string): boolean {
	const lower = value.trim().toLowerCase();
	if (lower.startsWith("/uploads/") || lower.startsWith("/api/storage/")) {
		return !lower.endsWith(".svg");
	}

	const normalized = normalizeHttpUrl(value);
	if (!normalized) return false;

	const url = new URL(normalized);
	return !url.pathname.toLowerCase().endsWith(".svg");
}

function getTrustedOriginCandidates(): string[] {
	const candidates: string[] = [];

	for (const value of [
		process.env.BETTER_AUTH_URL,
		process.env.APP_URL,
		process.env.PUBLIC_URL,
	]) {
		if (value) {
			candidates.push(value);
		}
	}

	const configuredOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS;
	if (configuredOrigins) {
		candidates.push(
			...configuredOrigins
				.split(",")
				.map((origin) => origin.trim())
				.filter(Boolean),
		);
	}

	return candidates;
}

export function resolveTrustedOrigins(request?: Request): string[] {
	const trustedOrigins = new Set<string>();

	if (request) {
		try {
			trustedOrigins.add(new URL(request.url).origin);
		} catch {
			// Ignore malformed request URL.
		}
	}

	for (const candidate of getTrustedOriginCandidates()) {
		try {
			trustedOrigins.add(new URL(candidate).origin);
		} catch {
			// Ignore malformed configured origin values.
		}
	}

	return [...trustedOrigins];
}

export function isTrustedRequestOrigin(request: Request): boolean {
	const origin = request.headers.get("origin");
	const trustedOrigins = new Set(resolveTrustedOrigins(request));

	if (origin) {
		return trustedOrigins.has(origin);
	}

	const referer = request.headers.get("referer");
	if (referer) {
		try {
			return trustedOrigins.has(new URL(referer).origin);
		} catch {
			return false;
		}
	}

	const secFetchSite = request.headers.get("sec-fetch-site");
	if (
		secFetchSite &&
		secFetchSite !== "same-origin" &&
		secFetchSite !== "same-site" &&
		secFetchSite !== "none"
	) {
		return false;
	}

	// Non-browser or same-origin requests may omit origin metadata.
	return true;
}
