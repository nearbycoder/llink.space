import { Check, Copy } from "lucide-react";
import { useId, useState } from "react";
import {
	audioUrl,
	parseBusinessHours,
	parseChecklist,
} from "#/lib/extended-blocks";
import type { ContentBlock } from "#/lib/page-design";
import { normalizeHttpUrl } from "#/lib/security";
import { useClientReady } from "#/lib/use-client-ready";
import { cn } from "#/lib/utils";

function Checklist({ block }: { block: ContentBlock }) {
	const ready = useClientReady();
	const items = (parseChecklist(block.body) ?? []).map((item, position) => ({
		...item,
		key: `${position}-${item.label}`,
	}));
	const [checked, setChecked] = useState(() => items.map((i) => i.checked));
	const id = useId();
	return (
		<section
			aria-label={block.title || "Checklist"}
			className="my-5 rounded-xl border border-current/20 p-4"
		>
			{block.title && (
				<h2 className="mb-3 text-lg font-semibold">{block.title}</h2>
			)}
			<ul className="flex flex-col gap-2">
				{items.map((item, index) => (
					<li key={item.key}>
						<label
							htmlFor={`${id}-${index}`}
							className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"
						>
							<input
								type="checkbox"
								disabled={!ready}
								id={`${id}-${index}`}
								checked={checked[index] ?? false}
								onChange={(e) =>
									setChecked((previous) =>
										previous.map((v, i) =>
											i === index ? e.target.checked : v,
										),
									)
								}
								className="size-4 shrink-0 accent-current"
							/>
							<span
								className={cn(
									"break-words",
									checked[index] && "line-through opacity-60",
								)}
							>
								{item.label}
							</span>
						</label>
					</li>
				))}
			</ul>
			<p className="mt-3 text-xs opacity-70" aria-live="polite">
				{checked.filter(Boolean).length} of {items.length} complete · for this
				visit
			</p>
		</section>
	);
}
function CodeSnippet({ block }: { block: ContentBlock }) {
	const ready = useClientReady();
	const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
	return (
		<section
			aria-label={block.title || "Code snippet"}
			className="my-5 min-w-0 rounded-xl border border-current/20 p-4"
		>
			<div className="mb-3 flex items-center justify-between gap-3">
				<h2 className="text-sm font-semibold">
					{block.title || "Code snippet"}
				</h2>
				<button
					type="button"
					disabled={!ready}
					className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-current/25 px-3 text-xs"
					onClick={async () => {
						try {
							await navigator.clipboard.writeText(block.body);
							setStatus("copied");
						} catch {
							setStatus("error");
						}
					}}
				>
					{status === "copied" ? <Check size={14} /> : <Copy size={14} />}
					{status === "copied" ? "Copied" : "Copy code"}
				</button>
			</div>
			<pre className="max-h-80 overflow-auto rounded-lg bg-current/5 p-3 text-xs leading-relaxed">
				<code>{block.body}</code>
			</pre>
			{status === "error" && (
				<p role="status" className="mt-2 text-xs">
					Copy is unavailable. Select the code to copy it manually.
				</p>
			)}
		</section>
	);
}
export function ExtendedBlockView({ block }: { block: ContentBlock }) {
	if (block.type === "checklist")
		return <Checklist key={`${block.id}-${block.body}`} block={block} />;
	if (block.type === "code")
		return <CodeSnippet key={`${block.id}-${block.body}`} block={block} />;
	if (block.type === "divider")
		return (
			<div className="my-7 flex items-center gap-4">
				<div className="h-px flex-1 bg-current/25" />
				{block.title && (
					<span className="max-w-[70%] break-words text-xs font-medium opacity-70">
						{block.title}
					</span>
				)}
				<div className="h-px flex-1 bg-current/25" />
			</div>
		);
	if (block.type === "hours") {
		const rows = parseBusinessHours(block.body);
		if (!rows) return null;
		return (
			<section
				aria-label={block.title || "Business hours"}
				className="my-5 rounded-xl border border-current/20 p-4"
			>
				<h2 className="mb-3 text-lg font-semibold">
					{block.title || "Business hours"}
				</h2>
				<dl className="flex flex-col gap-2">
					{rows.map((r) => (
						<div
							key={r.day}
							className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 py-2 text-sm last:border-0"
						>
							<dt>{r.day}</dt>
							<dd className="font-medium tabular-nums">{r.hours}</dd>
						</div>
					))}
				</dl>
				<p className="mt-3 text-xs opacity-70">All times in {block.timeZone}</p>
			</section>
		);
	}
	if (block.type === "button") {
		const url = normalizeHttpUrl(block.url);
		return url ? (
			<section className="my-5 flex flex-col gap-3" aria-label={block.title}>
				<a
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex min-h-12 items-center justify-center rounded-xl border border-current bg-current/10 px-5 py-3 text-center font-semibold break-words underline-offset-4 hover:underline"
				>
					{block.title}
				</a>
				{block.body && (
					<p className="whitespace-pre-wrap break-words text-center text-sm opacity-80">
						{block.body}
					</p>
				)}
			</section>
		) : null;
	}
	if (block.type === "audio") {
		const url = audioUrl(block.url);
		return url ? (
			<section
				className="my-5 flex flex-col gap-3 rounded-xl border border-current/20 p-4"
				aria-label={block.title}
			>
				<h2 className="text-lg font-semibold">{block.title}</h2>
				{block.body && (
					<p className="whitespace-pre-wrap break-words text-sm">
						{block.body}
					</p>
				)}
				<audio
					controls
					preload="none"
					src={url}
					className="w-full"
					aria-label={block.title}
				>
					<track kind="captions" />
					<a href={url}>Listen to {block.title}</a>
				</audio>
				<a
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					className="text-xs underline underline-offset-4"
				>
					Open audio file
				</a>
			</section>
		) : null;
	}
	return null;
}
