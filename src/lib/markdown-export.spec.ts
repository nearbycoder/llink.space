import { expect, it } from "vitest";
import { buildLinkMarkdown } from "./markdown-export";

it("produces portable Markdown without allowing injected links or headings", () => {
	const text = buildLinkMarkdown(
		[
			{
				title: "[wrong](url)\n# title",
				url: "https://example.com/a(b)",
				description: "**bold**",
				sectionId: "one",
			},
		],
		[{ id: "one", title: "My *work*" }],
	);
	expect(text).toContain("## My \\*work\\*");
	expect(text).toContain("(<https://example.com/a(b)>)");
	expect(text).not.toContain("\n# title");
	expect(text).toContain("\\[wrong\\]");
	expect(
		buildLinkMarkdown(
			[
				{
					title: "bad",
					url: "javascript:alert(1)",
					description: null,
					sectionId: null,
				},
			],
			[],
		),
	).not.toContain("javascript:");
});
