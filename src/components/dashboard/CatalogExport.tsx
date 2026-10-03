import { FileJson } from "lucide-react";
import { Button } from "#/components/ui/button";
import { downloadFile } from "#/lib/download-file";
import { buildLinkCatalog } from "#/lib/link-catalog";
import { useClientReady } from "#/lib/use-client-ready";
export function CatalogExport({
	links,
	sections,
}: {
	links: Parameters<typeof buildLinkCatalog>[0];
	sections: Parameters<typeof buildLinkCatalog>[1];
}) {
	const ready = useClientReady();
	return (
		<Button
			size="sm"
			variant="outline"
			disabled={!ready || !links.length}
			onClick={() =>
				downloadFile(
					buildLinkCatalog(links, sections),
					`llink-catalog-${new Date().toISOString().slice(0, 10)}.json`,
					"application/json",
				)
			}
		>
			<FileJson data-icon="inline-start" /> Export JSON catalog
		</Button>
	);
}
