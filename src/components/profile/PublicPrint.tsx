import { Printer } from "lucide-react";
import { useState } from "react";
import { useClientReady } from "#/lib/use-client-ready";

/** Prepares the print sheet (for example, its QR code), then opens the print dialog. */
export function PublicPrint({
	onPrepare,
}: {
	onPrepare?: () => Promise<void>;
}) {
	const ready = useClientReady();
	const [preparing, setPreparing] = useState(false);
	return (
		<button
			type="button"
			disabled={!ready || preparing}
			onClick={async () => {
				setPreparing(true);
				try {
					await onPrepare?.();
				} finally {
					setPreparing(false);
				}
				window.print();
			}}
			className="public-profile-tool !text-xs"
		>
			<Printer className="h-4 w-4" aria-hidden="true" />
			Print page
		</button>
	);
}
