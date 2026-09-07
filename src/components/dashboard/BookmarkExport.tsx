import { Button } from "#/components/ui/button";
import { type BookmarkLink, buildBookmarks } from "#/lib/bookmark-export";
import { downloadFile } from "#/lib/download-file";
export function BookmarkExport({
	links,
	sections,
}: {
	links: BookmarkLink[];
	sections: Array<{ id: string; title: string }>;
}) {
	return (
		<Button
			variant="outline"
			size="sm"
			disabled={!links.length}
			title="Download all links, including paused links, organized into bookmark folders"
			onClick={() =>
				downloadFile(
					buildBookmarks(links, sections),
					"llink-bookmarks.html",
					"text/html;charset=utf-8",
				)
			}
		>
			Export bookmarks
		</Button>
	);
}
