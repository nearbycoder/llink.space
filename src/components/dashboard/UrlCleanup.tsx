import { Button } from "#/components/ui/button";
import { cleanLinkUrl } from "#/lib/clean-link-url";

export function UrlCleanup({
	url,
	onApply,
}: {
	url: string;
	onApply: (url: string) => void;
}) {
	const cleaned = cleanLinkUrl(url);
	if (!cleaned?.removed.length) return null;
	return (
		<details className="rounded-xl border border-black/20 p-3 text-sm">
			<summary className="cursor-pointer font-semibold">
				Remove tracking parameters
			</summary>
			<p className="my-2 text-xs">
				Optional: removes {cleaned.removed.join(", ")}. Keep these if you need
				campaign attribution.
			</p>
			<p className="mb-3 break-all rounded-lg bg-white p-2 text-xs">
				{cleaned.url}
			</p>
			<Button
				type="button"
				size="sm"
				variant="outline"
				onClick={() => onApply(cleaned.url)}
			>
				Use clean URL
			</Button>
		</details>
	);
}
