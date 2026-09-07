import { type SetStateAction, useState } from "react";
export interface UndoHistory<T> {
	past: T[];
	present: T;
	future: T[];
}
export function pushHistory<T>(
	history: UndoHistory<T>,
	value: T,
): UndoHistory<T> {
	return JSON.stringify(history.present) === JSON.stringify(value)
		? history
		: {
				past: [...history.past, history.present].slice(-50),
				present: value,
				future: [],
			};
}
export function undoHistory<T>(h: UndoHistory<T>): UndoHistory<T> {
	return h.past.length
		? {
				past: h.past.slice(0, -1),
				present: h.past[h.past.length - 1],
				future: [h.present, ...h.future],
			}
		: h;
}
export function redoHistory<T>(h: UndoHistory<T>): UndoHistory<T> {
	return h.future.length
		? {
				past: [...h.past, h.present].slice(-50),
				present: h.future[0],
				future: h.future.slice(1),
			}
		: h;
}
export function useUndoState<T>(initial: T) {
	const [history, setHistory] = useState<UndoHistory<T>>({
		past: [],
		present: initial,
		future: [],
	});
	return {
		value: history.present,
		set: (action: SetStateAction<T>) =>
			setHistory((h) =>
				pushHistory(
					h,
					typeof action === "function"
						? (action as (value: T) => T)(h.present)
						: action,
				),
			),
		undo: () => setHistory(undoHistory),
		redo: () => setHistory(redoHistory),
		canUndo: history.past.length > 0,
		canRedo: history.future.length > 0,
	};
}
