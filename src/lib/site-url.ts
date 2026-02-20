function normalizeOrigin(value: string | undefined) {
	if (!value) return null;
	const trimmed = value.trim();
	if (!trimmed) return null;

	try {
		const asUrl = new URL(trimmed);
		return asUrl.origin;
	} catch {
		try {
			return new URL(`https://${trimmed}`).origin;
		} catch {
			return null;
		}
	}
}

export function getConfiguredSiteOrigin() {
	const candidates = [
		process.env.PUBLIC_URL,
		process.env.APP_URL,
		process.env.BETTER_AUTH_URL,
		process.env.VITE_SITE_URL,
		process.env.VITE_URL,
	];

	for (const candidate of candidates) {
		const origin = normalizeOrigin(candidate);
		if (origin) return origin;
	}

	return "https://llink.space";
}

export function resolveSiteOrigin(request?: Request) {
	if (request) {
		try {
			return new URL(request.url).origin;
		} catch {
			// Ignore malformed request URL and fall back to configured origin.
		}
	}

	return getConfiguredSiteOrigin();
}

export function toAbsoluteUrl(
	pathOrUrl: string,
	origin = getConfiguredSiteOrigin(),
) {
	if (!pathOrUrl) return origin;

	try {
		return new URL(pathOrUrl).toString();
	} catch {
		const normalizedPath = pathOrUrl.startsWith("/")
			? pathOrUrl
			: `/${pathOrUrl}`;
		return new URL(normalizedPath, origin).toString();
	}
}
