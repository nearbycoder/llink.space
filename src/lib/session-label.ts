/** Display aid only; user-agent strings are not trusted device identities. */
export function sessionLabel(agent?: string | null) {
	const ua = agent ?? "";
	const browser = /Edg\//.test(ua)
		? "Edge"
		: /OPR\//.test(ua)
			? "Opera"
			: /Firefox\//.test(ua)
				? "Firefox"
				: /Chrome\//.test(ua)
					? "Chrome"
					: /Safari\//.test(ua)
						? "Safari"
						: "Browser";
	const device = /Android/.test(ua)
		? "Android"
		: /iPhone|iPad|iPod/.test(ua)
			? "iOS"
			: /Windows/.test(ua)
				? "Windows"
				: /Macintosh|Mac OS/.test(ua)
					? "macOS"
					: /Linux/.test(ua)
						? "Linux"
						: "unknown device";
	return `${browser} on ${device}`;
}
