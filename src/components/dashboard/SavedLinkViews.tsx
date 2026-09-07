import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	type LinkView,
	linkViewSchema,
	readLinkViews,
} from "#/lib/saved-link-views";
export function SavedLinkViews({
	profileId,
	current,
	sectionIds,
	onApply,
}: {
	profileId: string;
	current: Omit<LinkView, "name">;
	sectionIds: string[];
	onApply: (view: Omit<LinkView, "name">) => void;
}) {
	const [views, setViews] = useState<LinkView[]>([]),
		[name, setName] = useState(""),
		[error, setError] = useState(""),
		[ready, setReady] = useState(false);
	const key = `llink.saved-views.${profileId}`;
	useEffect(() => {
		try {
			setViews(readLinkViews(localStorage.getItem(key)));
		} catch {
			setError(
				"Browser storage is unavailable. Views will last for this session only.",
			);
		}
		setReady(true);
	}, [key]);
	const persist = (next: LinkView[]) => {
		setViews(next);
		try {
			localStorage.setItem(key, JSON.stringify(next));
			setError("");
		} catch {
			setError(
				"Could not save in this browser. Views will last for this session only.",
			);
		}
	};
	const save = () => {
		const parsed = linkViewSchema.safeParse({ ...current, name });
		if (!parsed.success) {
			setError(
				"Use a name of 1–40 characters and a search of at most 500 characters.",
			);
			return;
		}
		if (
			views.some((v) => v.name.toLowerCase() === parsed.data.name.toLowerCase())
		) {
			setError(
				"A view with that name already exists. Delete it or choose a new name.",
			);
			return;
		}
		if (views.length >= 10) return;
		persist([...views, parsed.data]);
		setName("");
	};
	return (
		<details className="w-full rounded-xl border border-black/15 p-3">
			<summary className="cursor-pointer text-sm font-semibold">
				Saved filter views
			</summary>
			<p className="my-2 text-xs">
				Save up to 10 searches and filters in this browser. They do not sync
				between devices.
			</p>
			<div className="flex flex-wrap gap-2">
				<label className="min-w-0 flex-1 text-sm">
					View name
					<input
						value={name}
						onChange={(e) => setName(e.target.value)}
						maxLength={40}
						className="ml-2 max-w-full rounded border bg-white p-2 text-base"
					/>
				</label>
				<Button
					size="sm"
					variant="outline"
					disabled={!ready || !name.trim() || views.length >= 10}
					onClick={save}
				>
					Save current filters
				</Button>
			</div>
			{error && (
				<p role="alert" className="mt-2 text-sm text-red-700">
					{error}
				</p>
			)}
			{views.length === 10 && (
				<p className="mt-2 text-xs">
					View limit reached. Delete a view to save another.
				</p>
			)}
			<ul className="mt-3 flex flex-wrap gap-2">
				{views.map((v) => (
					<li key={v.name} className="flex rounded-lg border border-black/20">
						<button
							type="button"
							className="min-h-11 px-3 text-sm font-semibold"
							onClick={() =>
								onApply({
									...v,
									sectionId: ["all", "unsectioned", ...sectionIds].includes(
										v.sectionId,
									)
										? v.sectionId
										: "all",
								})
							}
						>
							{v.name}
						</button>
						<button
							type="button"
							className="min-h-11 px-3 text-sm"
							aria-label={`Delete view ${v.name}`}
							onClick={() => persist(views.filter((x) => x.name !== v.name))}
						>
							×
						</button>
					</li>
				))}
			</ul>
		</details>
	);
}
