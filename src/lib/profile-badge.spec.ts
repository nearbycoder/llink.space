import { expect, it } from "vitest";
import { buildProfileBadge } from "./profile-badge";

it("escapes badge HTML and rejects unsafe destinations", () => {
	const html = buildProfileBadge({
		url: "https://example.com/?a=1&b=2",
		label: '<img src=x onerror="alert(1)">',
		appearance: "dark",
	});
	expect(html).toContain("&lt;img");
	expect(html).not.toContain("<img");
	expect(html).toContain("a=1&amp;b=2");
	expect(html).toContain('rel="noopener noreferrer"');
	expect(() =>
		buildProfileBadge({
			url: "javascript:alert(1)",
			label: "Hi",
			appearance: "dark",
		}),
	).toThrow();
	expect(() =>
		buildProfileBadge({
			url: "https://example.com",
			label: " ",
			appearance: "light",
		}),
	).toThrow();
});
