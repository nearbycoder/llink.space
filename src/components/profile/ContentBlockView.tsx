import { type ContentBlock, videoEmbedUrl } from "#/lib/page-design";
import { isAllowedAvatarUrl } from "#/lib/security";
export function ContentBlockView({ block }: { block: ContentBlock }) {
	const video = block.type === "video" ? videoEmbedUrl(block.url) : null;
	return (
		<section
			className="my-5 space-y-2 break-words"
			aria-label={block.title || block.type}
		>
			{block.title && <h2 className="text-lg font-bold">{block.title}</h2>}
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
