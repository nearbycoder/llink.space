import { Button } from "#/components/ui/button";
import { downloadFile } from "#/lib/download-file";
import { buildLinkMarkdown } from "#/lib/markdown-export";
export function MarkdownExport({
	links,
	sections,
}: {
	links: Parameters<typeof buildLinkMarkdown>[0];
	sections: Parameters<typeof buildLinkMarkdown>[1];
}) {
	return (
		<Button
			variant="outline"
			size="sm"
			disabled={!links.length}
			title="Download all links and descriptions as Markdown, grouped by section"
			onClick={() =>
				downloadFile(
					buildLinkMarkdown(links, sections),
					"llink-links.md",
					"text/markdown;charset=utf-8",
				)
			}
		>
			Export Markdown
		</Button>
	);
}
