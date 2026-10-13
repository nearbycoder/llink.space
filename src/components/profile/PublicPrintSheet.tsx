import type { ContentBlock } from "#/lib/page-design";
import { normalizeHttpUrl } from "#/lib/security";
import { useClientReady } from "#/lib/use-client-ready";
import "./public-print.css";

interface PrintLink {
	id: string;
	title: string;
	url: string;
	description: string | null;
}

interface PrintSection {
	id: string;
	title: string;
	links: PrintLink[];
}

const PRINTABLE_BLOCKS = new Set<ContentBlock["type"]>([
	"heading",
	"text",
	"faq",
	"quote",
	"event",
	"hours",
]);

function displayUrl(url: string) {
	return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

function formatEventDate(value: string) {
	return new Date(value).toLocaleString("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

function PrintBlock({ block }: { block: ContentBlock }) {
	if (block.type === "heading")
		return <h3 className="print-block-heading">{block.title}</h3>;
	if (block.type === "quote")
		return (
			<blockquote className="print-block">
				<p>“{block.body}”</p>
				{block.title && <cite>— {block.title}</cite>}
			</blockquote>
		);
	if (block.type === "event")
		return (
			<div className="print-block">
				<p className="print-block-title">{block.title}</p>
				{block.startsAt && (
					<p className="print-block-meta">
						{formatEventDate(block.startsAt)}
						{block.endsAt ? ` – ${formatEventDate(block.endsAt)}` : ""}
					</p>
				)}
				{block.body && <p>{block.body}</p>}
			</div>
		);
	return (
		<div className="print-block">
			{block.title && <p className="print-block-title">{block.title}</p>}
			{block.body && <p>{block.body}</p>}
		</div>
	);
}

function PrintLinkList({
	links,
	start,
}: {
	links: PrintLink[];
	start: number;
}) {
	return (
		<ol className="print-links" start={start}>
			{links.map((link) => {
				const url = normalizeHttpUrl(link.url);
				return (
					<li key={link.id} className="print-link">
						<span className="print-link-title">{link.title}</span>
						{link.description && (
							<span className="print-link-description">{link.description}</span>
						)}
						{url && <span className="print-link-url">{displayUrl(url)}</span>}
					</li>
				);
			})}
		</ol>
	);
}

/**
 * A document-style version of the public page that only appears when printing:
 * every link with its destination, grouped by section, plus text blocks.
 * Rendered after hydration so it never adds to the server HTML.
 */
export function PublicPrintSheet({
	displayName,
	username,
	bio,
	pageUrl,
	qrSvg,
	blocks,
	unsectionedLinks,
	sections,
}: {
	displayName: string;
	username: string;
	bio: string | null;
	pageUrl: string;
	qrSvg: string | null;
	blocks: ContentBlock[];
	unsectionedLinks: PrintLink[];
	sections: PrintSection[];
}) {
	const ready = useClientReady();
	if (!ready) return null;
	const printableBlocks = blocks.filter(
		(block) => PRINTABLE_BLOCKS.has(block.type) && (block.title || block.body),
	);
	const total =
		unsectionedLinks.length +
		sections.reduce((sum, section) => sum + section.links.length, 0);
	let counter = unsectionedLinks.length + 1;
	return (
		<article className="public-print-sheet">
			<header className="print-header">
				<div className="print-identity">
					<p className="print-eyebrow">Links from</p>
					<h1>{displayName}</h1>
					<p className="print-handle">@{username}</p>
					{bio && <p className="print-bio">{bio}</p>}
				</div>
				<div className="print-visit">
					{qrSvg && (
						<div
							className="print-qr"
							// The SVG string is generated locally by the qrcode library.
							// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted local QR markup
							dangerouslySetInnerHTML={{ __html: qrSvg }}
						/>
					)}
					<p className="print-visit-label">Visit the live page</p>
					<p className="print-visit-url">{displayUrl(pageUrl)}</p>
				</div>
			</header>

			{printableBlocks.length > 0 && (
				<section className="print-notes">
					{printableBlocks.map((block) => (
						<PrintBlock key={block.id} block={block} />
					))}
				</section>
			)}

			{total === 0 ? (
				<p className="print-empty">No links yet.</p>
			) : (
				<>
					{unsectionedLinks.length > 0 && (
						<PrintLinkList links={unsectionedLinks} start={1} />
					)}
					{sections.map((section) => {
						const start = counter;
						counter += section.links.length;
						return (
							<section key={section.id} className="print-section">
								<h2>
									{section.title}
									<span>{section.links.length}</span>
								</h2>
								<PrintLinkList links={section.links} start={start} />
							</section>
						);
					})}
				</>
			)}

			<footer className="print-footer">
				<span>
					{total} link{total === 1 ? "" : "s"} · {displayUrl(pageUrl)}
				</span>
				<span>Made with llink.space</span>
			</footer>
		</article>
	);
}
