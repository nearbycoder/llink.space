import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { downloadFile } from "#/lib/download-file";
import { useFixedBodyScroll } from "#/lib/use-fixed-body-scroll";
export function QrShare({
	username,
	customDomain,
}: {
	username: string;
	customDomain?: string | null;
}) {
	const [ready, setReady] = useState(false);
	useEffect(() => setReady(true), []);
	const [url, setUrl] = useState("");
	const [image, setImage] = useState<{ svg: string; png: string } | null>(null);
	const [error, setError] = useState(false);
	useFixedBodyScroll(!!url);
	useEffect(() => {
		if (!url) return;
		let cancelled = false;
		setImage(null);
		setError(false);
		import("qrcode")
			.then(async ({ default: QR }) => {
				const [svg, png] = await Promise.all([
					QR.toString(url, {
						type: "svg",
						margin: 4,
						errorCorrectionLevel: "M",
					}),
					QR.toDataURL(url, {
						width: 1024,
						margin: 4,
						errorCorrectionLevel: "M",
					}),
				]);
				if (!cancelled) setImage({ svg, png });
			})
			.catch(() => {
				if (!cancelled) setError(true);
			});
		return () => {
			cancelled = true;
		};
	}, [url]);
	return (
		<>
			<button
				type="button"
				disabled={!ready}
				className="rounded-full border-2 border-black bg-white px-3 py-2 text-xs font-bold text-[#11110F]"
				onClick={() =>
					setUrl(
						customDomain
							? `https://${customDomain}/`
							: `${window.location.origin}/u/${encodeURIComponent(username)}`,
					)
				}
			>
				QR code
			</button>
			<Dialog
				open={!!url}
				onOpenChange={(open) => {
					if (!open) setUrl("");
				}}
			>
				<DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Share with a scan</DialogTitle>
						<DialogDescription>
							Save a QR code for posters, business cards, or your next event.
						</DialogDescription>
					</DialogHeader>
					{image ? (
						<img
							src={image.png}
							alt={`QR code for @${username}`}
							className="mx-auto aspect-square w-60 max-w-full rounded-xl bg-white"
						/>
					) : (
						<p role="status">
							{error
								? "Could not generate the QR code. Close and try again."
								: "Creating your code…"}
						</p>
					)}
					<p className="break-all text-center text-xs">{url}</p>
					<div className="flex flex-wrap gap-2">
						<Button
							disabled={!image}
							onClick={() => {
								if (image)
									downloadFile(
										image.svg,
										`profile-${username}-qr.svg`,
										"image/svg+xml",
									);
							}}
						>
							Download SVG
						</Button>
						<Button
							variant="outline"
							disabled={!image}
							onClick={() => {
								if (image) {
									const a = document.createElement("a");
									a.href = image.png;
									a.download = `profile-${username}-qr.png`;
									a.click();
								}
							}}
						>
							Download PNG
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
