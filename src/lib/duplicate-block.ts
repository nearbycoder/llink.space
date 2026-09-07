import type { ContentBlock } from "./page-design";
export function duplicateBlock(
	blocks: ContentBlock[],
	id: string,
	newId: string,
) {
	if (blocks.length >= 30)
		throw new Error("A page can contain at most 30 blocks.");
	const index = blocks.findIndex((b) => b.id === id);
	if (index < 0) throw new Error("Block not found.");
	if (blocks.some((b) => b.id === newId))
		throw new Error("The copy needs a unique ID.");
	const copy = { ...structuredClone(blocks[index]), id: newId };
	return [...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)];
}
