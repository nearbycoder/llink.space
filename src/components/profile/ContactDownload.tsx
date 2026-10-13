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
			className="public-profile-tool !text-xs"
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
