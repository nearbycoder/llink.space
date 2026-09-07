import { expect, it } from "vitest";
import { parseStyleBackup } from "./design-backup";

it("validates versions and content and repairs references without importing identity", () => {
	const backup = {
		version: 1,
		theme: "dark",
		fontFamily: "work",
		buttonStyle: "pill",
		accentColor: null,
		userId: "do-not-import",
		contentBlocks: [
			{
				id: "a32c8f73-0639-4bba-973c-f79f646fd750",
				type: "text",
				title: "Hello",
				body: "",
				url: "",
				afterLinkId: "a32c8f73-0639-4bba-973c-f79f646fd751",
			},
		],
	};
	expect(
		parseStyleBackup(JSON.stringify(backup), []).contentBlocks[0].afterLinkId,
	).toBeNull();
	expect(parseStyleBackup(JSON.stringify(backup), [])).not.toHaveProperty(
		"userId",
	);
	expect(() =>
		parseStyleBackup(JSON.stringify({ ...backup, version: 2 }), []),
	).toThrow();
	expect(() => parseStyleBackup("{bad", [])).toThrow();
	expect(() => parseStyleBackup(" ".repeat(262145), [])).toThrow();
});
