import { expect, it } from "vitest";
import {
	pushHistory,
	redoHistory,
	type UndoHistory,
	undoHistory,
} from "./use-undo-state";

it("supports undo, redo, branching and bounded immutable snapshots", () => {
	let h: UndoHistory<number> = { past: [], present: 0, future: [] };
	for (let i = 1; i < 60; i++) h = pushHistory(h, i);
	expect(h.past).toHaveLength(50);
	const back = undoHistory(h);
	expect(back.present).toBe(58);
	expect(redoHistory(back).present).toBe(59);
	expect(pushHistory(back, 100).future).toEqual([]);
	expect(h.present).toBe(59);
	expect(pushHistory(h, 59)).toBe(h);
});
