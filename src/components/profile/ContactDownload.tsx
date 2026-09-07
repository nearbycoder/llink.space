import { ContactRound } from "lucide-react";
import { useEffect, useState } from "react";
import { downloadFile } from "#/lib/download-file";
import { buildVcard } from "#/lib/vcard";
export function ContactDownload({
	name,
	bio,
	username,
	customDomain,
}: {
	name: string;
	bio: string | null;
	username: string;
	customDomain?: string | null;
}) {
	const [ready, setReady] = useState(false);
	useEffect(() => setReady(true), []);
	return (
		<button
			type="button"
			disabled={!ready}
			className="inline-flex min-h-11 items-center gap-2 rounded-full border border-current/30 px-3 text-xs font-semibold"
			onClick={() =>
				downloadFile(
					buildVcard({
						name,
						bio,
						url: customDomain
							? `https://${customDomain}/`
							: `${window.location.origin}/u/${encodeURIComponent(username)}`,
					}),
					`${username}.vcf`,
					"text/vcard;charset=utf-8",
				)
			}
		>
			<ContactRound className="h-4 w-4" aria-hidden="true" />
			Save contact
		</button>
	);
}
