import { expect, it } from "vitest";
import { buildBookmarks } from "./bookmark-export";

it("exports safe browser folders and escapes untrusted markup", () => {
	const html = buildBookmarks(
		[
			{
				title: "<script>work</script>",
				url: "https://example.com/?x=1&y=2",
				description: "A & B",
				sectionId: "one",
			},
			{
				title: "bad",
				url: "javascript:alert(1)",
				description: null,
				sectionId: null,
			},
		],
		[{ id: "one", title: "Work <2026>" }],
	);
	expect(html).toContain("NETSCAPE-Bookmark-file-1");
	expect(html).toContain("<H3>Work &lt;2026&gt;</H3>");
	expect(html).toContain("&amp;y=2");
	expect(html).not.toContain("<script>");
	expect(html).not.toContain("javascript:");
});
