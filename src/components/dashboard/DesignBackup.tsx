import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	parseStyleBackup,
	type StyleBackup,
	styleBackupSchema,
} from "#/lib/design-backup";
import { downloadFile } from "#/lib/download-file";
export function DesignBackup({
	draft,
	linkIds,
	onRestore,
}: {
	draft: {
		theme: string | null;
		fontFamily: string;
		buttonStyle: string;
		accentColor: string | null;
		contentBlocks: StyleBackup["contentBlocks"];
	};
	linkIds: string[];
	onRestore: (backup: StyleBackup) => void;
}) {
	const [pending, setPending] = useState<StyleBackup | null>(null),
		[error, setError] = useState("");
	const download = () => {
		const parsed = styleBackupSchema.safeParse({
			version: 1,
			...draft,
			theme: draft.theme ?? "default",
		});
		if (!parsed.success) {
			setError(
				"Complete or remove invalid blocks before downloading a backup.",
			);
			return;
		}
		setError("");
		downloadFile(
			JSON.stringify(parsed.data, null, 2),
			"llink-style.json",
			"application/json",
		);
	};
	return (
		<details className="kinetic-panel bg-[#FFFCEF] p-5">
			<summary className="cursor-pointer font-bold">Style backups</summary>
			<p className="my-3 text-xs">
				Back up your theme, typography, button style, accent, and content
				blocks. Profile details, background photos, and links stay separate.
				Restoring changes your draft; publish when ready.
			</p>
			<div className="flex flex-wrap items-center gap-3">
				<Button variant="outline" onClick={download}>
					Download style backup
				</Button>
				<label className="block text-sm font-semibold">
					Restore style backup
					<input
						type="file"
						accept=".json,application/json"
						className="mt-2 block max-w-full text-sm"
						onChange={async (e) => {
							const file = e.target.files?.[0];
							e.target.value = "";
							if (!file) return;
							try {
								if (file.size > 262144)
									throw new Error("Choose a backup smaller than 256 KB.");
								setPending(parseStyleBackup(await file.text(), linkIds));
								setError("");
							} catch (err) {
								setError(
									err instanceof Error
										? err.message
										: "Could not read the backup.",
								);
							}
						}}
					/>
				</label>
			</div>
			{error && (
				<p role="alert" className="mt-3 text-sm text-red-700">
					{error}
				</p>
			)}
			<Dialog
				open={!!pending}
				onOpenChange={(open) => {
					if (!open) setPending(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Restore this style?</DialogTitle>
						<DialogDescription>
							This replaces the theme and blocks in your draft. Blocks
							referencing missing links move before the links. Your live page
							stays unchanged until you publish.
						</DialogDescription>
					</DialogHeader>
					<p className="text-sm">
						{pending?.theme} · {pending?.contentBlocks.length} content blocks
					</p>
					<DialogFooter>
						<Button variant="outline" onClick={() => setPending(null)}>
							Cancel
						</Button>
						<Button
							onClick={() => {
								if (pending) onRestore(pending);
								setPending(null);
							}}
						>
							Restore backup
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</details>
	);
}
