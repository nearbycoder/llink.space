import { useEffect, useState } from "react";
import { buildCalendar } from "#/lib/calendar-export";
import { downloadFile } from "#/lib/download-file";
import type { ContentBlock } from "#/lib/page-design";
import { normalizeHttpUrl } from "#/lib/security";
export function EventBlock({ block }: { block: ContentBlock }) {
	const [ready, setReady] = useState(false);
	useEffect(() => setReady(true), []);
	const label = (value: string) =>
		new Date(value).toLocaleString("en-US", {
			dateStyle: "medium",
			timeStyle: "short",
			timeZone: ready ? undefined : "UTC",
		});
	if (!block.startsAt) return null;
	const url = normalizeHttpUrl(block.url);
	return (
		<section
			aria-label={block.title}
			className="my-5 space-y-3 rounded-xl border border-current/25 p-4"
		>
			<p className="text-xs font-semibold uppercase tracking-wider">Event</p>
			<h2 className="text-lg font-bold">{block.title}</h2>
			<p className="text-sm">
				<time dateTime={block.startsAt}>{label(block.startsAt)}</time>
				{block.endsAt && (
					<>
						{" "}
						– <time dateTime={block.endsAt}>{label(block.endsAt)}</time>
					</>
				)}
			</p>
			<p className="text-xs opacity-70">
				{ready ? "Times shown in your local time zone." : "Times shown in UTC."}
			</p>
			{block.body && (
				<p className="whitespace-pre-wrap break-words text-sm">{block.body}</p>
			)}
			<div className="flex flex-wrap gap-3">
				{url && (
					<a
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex min-h-11 items-center underline underline-offset-4"
					>
						Event details ↗
					</a>
				)}
				<button
					type="button"
					disabled={!ready}
					className="min-h-11 rounded-lg border border-current px-3 text-sm font-semibold"
					onClick={() =>
						downloadFile(
							buildCalendar([
								{
									id: block.id,
									title: block.title,
									start: block.startsAt!,
									end: block.endsAt,
									description: block.body,
									url: url ?? undefined,
								},
							]),
							"llink-event.ics",
							"text/calendar;charset=utf-8",
						)
					}
				>
					Add to calendar
				</button>
			</div>
		</section>
	);
}
