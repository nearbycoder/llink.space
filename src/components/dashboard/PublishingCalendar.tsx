import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { buildCalendar, publishingEntries } from "#/lib/calendar-export";
import { downloadFile } from "#/lib/download-file";
export function PublishingCalendar({
	links,
}: {
	links: Parameters<typeof publishingEntries>[0];
}) {
	const [open, setOpen] = useState(false),
		[days, setDays] = useState(30);
	const entries = publishingEntries(links, days);
	return (
		<>
			<Button size="sm" variant="outline" onClick={() => setOpen(true)}>
				Publishing calendar
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Publishing calendar</DialogTitle>
						<DialogDescription>
							Upcoming start and expiry times, shown in your time zone. Paused
							links stay paused until you publish them.
						</DialogDescription>
					</DialogHeader>
					<label className="text-sm">
						Calendar range
						<select
							className="ml-2 rounded border p-2 text-base"
							value={days}
							onChange={(e) => setDays(Number(e.target.value))}
						>
							{[7, 30, 90].map((d) => (
								<option key={d} value={d}>
									Next {d} days
								</option>
							))}
						</select>
					</label>
					{entries.length ? (
						<ol className="space-y-3">
							{entries.map((e) => (
								<li
									key={e.id}
									className="rounded-xl border border-black/20 p-3"
								>
									<p className="text-sm font-bold">{e.title}</p>
									<time dateTime={e.start} className="text-xs">
										{new Date(e.start).toLocaleString()}
									</time>
								</li>
							))}
						</ol>
					) : (
						<p className="text-sm">
							Nothing scheduled in this range. Add start or expiry times when
							editing a link.
						</p>
					)}
					<Button
						disabled={!entries.length}
						onClick={() =>
							downloadFile(
								buildCalendar(entries),
								"llink-publishing.ics",
								"text/calendar;charset=utf-8",
							)
						}
					>
						Download calendar
					</Button>
				</DialogContent>
			</Dialog>
		</>
	);
}
