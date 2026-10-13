import { Plus } from "lucide-react";
import { type ContentBlock, videoEmbedUrl } from "#/lib/page-design";
import { isAllowedAvatarUrl, normalizeHttpUrl } from "#/lib/security";
import { EventBlock } from "./EventBlock";
import { ExtendedBlockView } from "./ExtendedBlockView";
export function ContentBlockView({
	block,
	preview = false,
}: {
	block: ContentBlock;
	preview?: boolean;
}) {
	if (
		["audio", "button", "divider", "code", "checklist", "hours"].includes(
			block.type,
		)
	)
		return <ExtendedBlockView block={block} />;
	if (block.type === "faq")
		return (
			<details
				open={preview || undefined}
				className="group my-5 rounded-2xl border border-current/15 px-4 py-3"
			>
				<summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 py-1 font-semibold [&::-webkit-details-marker]:hidden">
					{block.title}
					<Plus
						aria-hidden="true"
						className="size-4 shrink-0 opacity-60 transition-transform group-open:rotate-45"
					/>
				</summary>
				<p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">
					{block.body}
				</p>
			</details>
		);
	if (block.type === "quote")
		return (
			<figure className="my-6 border-l-2 border-[#FF5F1F] pl-4">
				<blockquote className="whitespace-pre-wrap break-words text-base leading-relaxed">
					{block.body}
				</blockquote>
				<figcaption className="mt-3 text-sm">
					<cite className="not-italic font-semibold">
						{block.url && normalizeHttpUrl(block.url) ? (
							<a
								href={normalizeHttpUrl(block.url) ?? undefined}
								target="_blank"
								rel="noopener noreferrer"
								className="underline underline-offset-4"
							>
								{block.title}
							</a>
						) : (
							block.title
						)}
					</cite>
				</figcaption>
			</figure>
		);
	if (block.type === "event") return <EventBlock block={block} />;
	const video = block.type === "video" ? videoEmbedUrl(block.url) : null;
	return (
		<section
			className="my-5 space-y-2 break-words"
			aria-label={block.title || block.type}
		>
			{block.title && (
				<h2 className="text-lg font-semibold tracking-[-0.015em]">
					{block.title}
				</h2>
			)}
			{block.body && (
				<p className="whitespace-pre-wrap text-sm leading-relaxed">
					{block.body}
				</p>
			)}
			{block.type === "image" && isAllowedAvatarUrl(block.url) && (
				<img
					src={block.url}
					alt={block.title}
					loading="lazy"
					className="w-full rounded-xl"
				/>
			)}
			{video && (
				<iframe
					src={video}
					title={block.title || "Video"}
					loading="lazy"
					className="aspect-video w-full rounded-xl border-0"
					allow="fullscreen; picture-in-picture"
					sandbox="allow-scripts allow-same-origin allow-presentation"
					referrerPolicy="strict-origin-when-cross-origin"
					allowFullScreen
				/>
			)}
			{block.type === "contact" &&
				/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(block.url) && (
					<a
						href={`mailto:${encodeURIComponent(block.url)}`}
						className="inline-block underline underline-offset-4"
					>
						{block.url}
					</a>
				)}
		</section>
	);
}
