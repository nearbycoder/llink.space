import { normalizeHttpUrl } from "#/lib/security";
export function ReadingList({
	links,
	onRemove,
	onClear,
	onVisit,
	error,
}: {
	links: Array<{ id: string; title: string; url: string }>;
	onRemove: (id: string) => void;
	onClear: () => void;
	onVisit: (id: string) => void;
	error: string;
}) {
	return (
		<div data-print-hidden>
			{error && (
				<p role="status" className="mb-3 text-sm">
					{error}
				</p>
			)}
			<details
				data-print-hidden
				className="mb-5 rounded-xl border border-current/25 p-3"
			>
				<summary className="cursor-pointer py-1 text-sm font-semibold">
					Reading list · {links.length}
				</summary>
				<p className="my-3 text-xs">
					Saved in this browser for this page. Use Save beside a link to keep it
					for later. Links that are no longer public disappear from this list.
				</p>
				{links.length ? (
					<>
						<ul className="divide-y divide-current/15">
							{links.map((link) => (
								<li
									key={link.id}
									className="flex items-center justify-between gap-3 py-2"
								>
									<a
										href={normalizeHttpUrl(link.url) ?? undefined}
										target="_blank"
										rel="noopener noreferrer nofollow ugc"
										onClick={() => onVisit(link.id)}
										className="min-w-0 break-words py-2 text-sm underline underline-offset-4"
									>
										{link.title}
									</a>
									<button
										type="button"
										aria-label={`Remove ${link.title} from reading list`}
										className="min-h-11 shrink-0 px-2 text-xs font-semibold"
										onClick={() => onRemove(link.id)}
									>
										Remove
									</button>
								</li>
							))}
						</ul>
						<button
							type="button"
							className="mt-2 min-h-11 rounded-lg border border-current/30 px-3 text-sm"
							onClick={onClear}
						>
							Clear reading list
						</button>
					</>
				) : (
					<p className="text-sm">No saved links yet.</p>
				)}
			</details>
		</div>
	);
}
