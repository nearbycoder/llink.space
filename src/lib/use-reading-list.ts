import { useEffect, useState } from "react";
import { readingListKey, readSavedLinks } from "./reading-list";
export function useReadingList(
	profileId: string,
	visibleIds: string[],
	enabled: boolean,
) {
	const [ids, setIds] = useState<string[]>([]),
		[ready, setReady] = useState(false),
		[error, setError] = useState("");
	const key = readingListKey(profileId),
		visibleKey = visibleIds.join(",");
	useEffect(() => {
		if (!enabled) return;
		const visible = visibleKey.split(",");
		try {
			setIds(readSavedLinks(localStorage.getItem(key), visible));
			setError("");
		} catch {
			setIds([]);
			setError(
				"Browser storage is unavailable. Saved links last only while this page stays open.",
			);
		}
		setReady(true);
		const sync = (e: StorageEvent) => {
			if (e.key === key || e.key === null)
				setIds(readSavedLinks(e.newValue, visible));
		};
		window.addEventListener("storage", sync);
		return () => window.removeEventListener("storage", sync);
	}, [key, visibleKey, enabled]);
	const persist = (next: string[]) => {
		setIds(next);
		try {
			localStorage.setItem(key, JSON.stringify(next));
			setError("");
		} catch {
			setError(
				"Browser storage is unavailable. Saved links last only while this page stays open.",
			);
		}
	};
	return {
		ids,
		ready,
		error,
		toggle: (id: string) => {
			if (!ready || !visibleIds.includes(id)) return;
			if (ids.includes(id)) persist(ids.filter((v) => v !== id));
			else if (ids.length < 500) persist([...ids, id]);
			else
				setError(
					"Your reading list is full. Remove a saved link before adding another.",
				);
		},
		clear: () => persist([]),
	};
}
