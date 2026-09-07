import { Check, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { QrShare } from "./QrShare";

interface PublicProfileShareProps {
	customDomain?: string | null;
	displayName: string;
	username: string;
}

async function copyUrl(value: string) {
	if (navigator.clipboard) {
		try {
			await navigator.clipboard.writeText(value);
			return;
		} catch {
			// Some embedded browsers expose Clipboard without granting access.
		}
	}

	const textarea = document.createElement("textarea");
	textarea.value = value;
	textarea.setAttribute("readonly", "");
	textarea.style.position = "fixed";
	textarea.style.opacity = "0";
	document.body.append(textarea);
	textarea.select();
	const copied = document.execCommand("copy");
	textarea.remove();
	if (!copied) throw new Error("Clipboard unavailable");
}

export function PublicProfileShare({
	displayName,
	customDomain,
	username,
}: PublicProfileShareProps) {
	const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
	const resetTimerRef = useRef<number | null>(null);

	useEffect(
		() => () => {
			if (resetTimerRef.current !== null) {
				window.clearTimeout(resetTimerRef.current);
			}
		},
		[],
	);

	const showTemporaryStatus = (nextStatus: "copied" | "error") => {
		setStatus(nextStatus);
		if (resetTimerRef.current !== null) {
			window.clearTimeout(resetTimerRef.current);
		}
		resetTimerRef.current = window.setTimeout(() => setStatus("idle"), 2200);
	};

	const handleShare = async () => {
		const url = customDomain
			? `https://${customDomain}/`
			: `${window.location.origin}/u/${encodeURIComponent(username)}`;
		if (navigator.share) {
			try {
				await navigator.share({
					title: `${displayName} | llink.space`,
					text: `Explore @${username}'s links`,
					url,
				});
				return;
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError")
					return;
			}
		}

		try {
			await copyUrl(url);
			showTemporaryStatus("copied");
		} catch {
			showTemporaryStatus("error");
		}
	};

	return (
		<div className="mb-3 flex flex-wrap justify-end gap-2">
			<QrShare username={username} customDomain={customDomain} />
			<button
				type="button"
				onClick={handleShare}
				className="inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-white px-3 py-1.5 text-xs font-bold text-[#11110F] shadow-[2px_2px_0_0_#11110F] transition-transform hover:-translate-y-0.5"
				aria-label="Share profile"
				aria-live="polite"
			>
				{status === "copied" ? (
					<Check className="h-3.5 w-3.5" />
				) : (
					<Share2 className="h-3.5 w-3.5" />
				)}
				{status === "copied"
					? "Link copied"
					: status === "error"
						? "Copy failed"
						: "Share"}
			</button>
		</div>
	);
}
