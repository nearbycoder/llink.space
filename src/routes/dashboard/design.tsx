import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import type { SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DesignBackup } from "#/components/dashboard/DesignBackup";
import { PageReadiness } from "#/components/dashboard/PageReadiness";
import { UnsavedChangesGuard } from "#/components/dashboard/UnsavedChangesGuard";
import {
	type PublicPageData,
	PublicProfilePage,
} from "#/components/profile/PublicProfilePage";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { useTRPC } from "#/integrations/trpc/react";
import { getDashboardDesign } from "#/lib/auth-server";
import { duplicateBlock } from "#/lib/duplicate-block";
import { isLinkPublished } from "#/lib/link-publishing";
import {
	BLOCK_TYPES,
	BUTTON_STYLES,
	type ContentBlock,
	FONT_OPTIONS,
	pageTemplates,
} from "#/lib/page-design";
import { themes } from "#/lib/themes";
import { useUndoState } from "#/lib/use-undo-state";
export const Route = createFileRoute("/dashboard/design")({
	loader: async () => {
		const data = await getDashboardDesign();
		if (data.status === "unauthenticated") throw redirect({ to: "/sign-in" });
		if (data.status === "no-profile") throw redirect({ to: "/onboarding" });
		return data;
	},
	component: DesignStudio,
});
const field =
	"mt-1 w-full rounded-lg border border-black/30 bg-white px-3 py-2 text-base sm:text-sm text-[#11110F]";
function DesignStudio() {
	const [ready, setReady] = useState(false);
	useEffect(() => setReady(true), []);
	const initial = Route.useLoaderData();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const history = useUndoState({
		profile: { ...initial.profile },
		links: initial.layout.links,
	});
	const draft = history.value.profile,
		draftLinks = history.value.links;
	const setDraft = (action: SetStateAction<typeof draft>) =>
		history.set((v) => ({
			...v,
			profile: typeof action === "function" ? action(v.profile) : action,
		}));
	const setDraftLinks = (action: SetStateAction<typeof draftLinks>) =>
		history.set((v) => ({
			...v,
			links: typeof action === "function" ? action(v.links) : action,
		}));
	const [saved, setSaved] = useState(
		JSON.stringify({ profile: initial.profile, links: initial.layout.links }),
	);
	const [selectedTemplate, setSelectedTemplate] = useState<
		(typeof pageTemplates)[number] | null
	>(null);
	const templateTrigger = useRef<HTMLButtonElement | null>(null);
	const [device, setDevice] = useState<"phone" | "desktop">("phone");
	const dirty = JSON.stringify({ profile: draft, links: draftLinks }) !== saved;
	const save = useMutation(trpc.design.save.mutationOptions());
	const update = (patch: Partial<typeof draft>) =>
		setDraft((v) => ({ ...v, ...patch }));
	const updateBlock = (id: string, patch: Partial<ContentBlock>) =>
		update({
			contentBlocks: draft.contentBlocks.map((b) =>
				b.id === id ? { ...b, ...patch } : b,
			),
		});
	const published = draftLinks.filter((l) => isLinkPublished(l));
	const preview: PublicPageData = {
		customDomain: null,
		profile: draft,
		links: published,
		unsectionedLinks: published.filter((l) => !l.sectionId),
		sections: initial.layout.sections
			.map((s) => ({
				...s,
				links: published.filter((l) => l.sectionId === s.id),
			}))
			.filter((s) => s.links.length),
	};
	const applyTemplate = () => {
		if (!selectedTemplate) return;
		const t = selectedTemplate;
		update({
			theme: t.theme,
			pageBackgroundType: "theme",
			accentColor: null,
			fontFamily:
				t.id === "restaurant" || t.id === "freelancer" ? "editorial" : "work",
			contentBlocks: [
				{
					id: crypto.randomUUID(),
					type: "heading",
					title: t.heading,
					body: t.body,
					url: "",
					afterLinkId: null,
				},
			],
		});
		setSelectedTemplate(null);
	};
	const publish = async () => {
		try {
			const edits = draftLinks
				.filter((l) => {
					const old = initial.layout.links.find((o) => o.id === l.id);
					return old?.title !== l.title || old?.url !== l.url;
				})
				.map(({ id, title, url }) => ({ id, title, url }));
			await save.mutateAsync({
				displayName: draft.displayName || draft.username,
				bio: draft.bio || "",
				avatarUrl: draft.avatarUrl,
				theme: draft.theme || "default",
				fontFamily: draft.fontFamily as "work" | "editorial" | "mono",
				buttonStyle: draft.buttonStyle as (typeof BUTTON_STYLES)[number],
				accentColor: draft.accentColor,
				pageBackgroundType: draft.pageBackgroundType as
					| "theme"
					| "color"
					| "gradient"
					| "image",
				contentBlocks: draft.contentBlocks,
				linkEdits: edits,
			});
			setSaved(JSON.stringify({ profile: draft, links: draftLinks }));
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: trpc.profile.getCurrent.queryKey(),
				}),
				queryClient.invalidateQueries({ queryKey: trpc.links.list.queryKey() }),
				queryClient.invalidateQueries({
					queryKey: trpc.links.getPublic.queryKey(),
				}),
			]);
			toast.success("Page design published");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Could not publish changes");
		}
	};
	return (
		<div className="mx-auto max-w-7xl p-4 sm:p-8">
			<UnsavedChangesGuard when={dirty || save.isPending} />
			<Dialog
				open={selectedTemplate !== null}
				onOpenChange={(open) => {
					if (!open) setSelectedTemplate(null);
				}}
			>
				<DialogContent
					className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
					onCloseAutoFocus={(event) => {
						event.preventDefault();
						templateTrigger.current?.focus();
					}}
				>
					{selectedTemplate && (
						<>
							<DialogHeader className="pr-6 text-left">
								<DialogTitle className="text-2xl font-black">
									Use {selectedTemplate.name}?
								</DialogTitle>
								<DialogDescription className="leading-relaxed">
									This replaces the theme and content blocks in your draft. Your
									links and profile details stay in place.
								</DialogDescription>
							</DialogHeader>
							<div
								className="rounded-xl border-2 border-black p-5 shadow-[3px_3px_0_0_#11110F]"
								style={{
									background: themes[selectedTemplate.theme].background,
									color: themes[selectedTemplate.theme].text,
								}}
							>
								<p className="text-xs font-bold uppercase tracking-widest">
									{selectedTemplate.audience}
								</p>
								<h3 className="mt-4 text-xl font-bold">
									{selectedTemplate.heading}
								</h3>
								<p className="mt-2 text-sm leading-relaxed">
									{selectedTemplate.body}
								</p>
							</div>
							<p className="text-sm">
								Preview the result before publishing. Your live page changes
								only when you select Publish design.
							</p>
							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => setSelectedTemplate(null)}
								>
									Cancel
								</Button>
								<Button onClick={applyTemplate}>Use template</Button>
							</DialogFooter>
						</>
					)}
				</DialogContent>
			</Dialog>
			<header className="mb-7 flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="text-xs font-bold uppercase tracking-[.18em]">
						Make it yours
					</p>
					<h1 className="mt-2 text-3xl font-black">Design studio</h1>
					<p className="mt-2 text-sm">
						Shape your page, preview every change, then publish.
					</p>
				</div>
				<Button onClick={publish} disabled={!ready || !dirty || save.isPending}>
					{save.isPending ? "Publishing…" : "Publish design"}
				</Button>
			</header>
			<div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
				<fieldset
					disabled={!ready || save.isPending}
					className="min-w-0 space-y-5"
				>
					<div className="kinetic-panel bg-[#FFFCEF] p-4">
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={history.undo}
								disabled={!history.canUndo}
							>
								Undo change
							</Button>
							<Button
								variant="outline"
								onClick={history.redo}
								disabled={!history.canRedo}
							>
								Redo change
							</Button>
						</div>
						<p className="mt-2 text-xs">
							Undo up to 50 draft changes in this session, including templates,
							blocks, and link edits. Publish to update your page.
						</p>
					</div>
					<PageReadiness profile={draft} links={draftLinks} />
					<DesignBackup
						draft={draft}
						linkIds={draftLinks.map((l) => l.id)}
						onRestore={(backup) =>
							update({
								theme: backup.theme,
								fontFamily: backup.fontFamily,
								buttonStyle: backup.buttonStyle,
								accentColor: backup.accentColor,
								contentBlocks: backup.contentBlocks,
								pageBackgroundType: "theme",
							})
						}
					/>
					<section className="kinetic-panel space-y-4 bg-[#FFFCEF] p-5">
						<h2 className="text-lg font-bold">Start with a template</h2>
						<p className="text-xs">
							Templates replace the theme and content blocks in your draft. Your
							links stay in place.
						</p>
						<div className="grid grid-cols-2 gap-3">
							{pageTemplates.map((t) => (
								<button
									type="button"
									key={t.id}
									className="rounded-xl border-2 border-black p-3 text-left shadow-[2px_2px_0_0_#11110F]"
									style={{
										background: themes[t.theme].background,
										color: themes[t.theme].text,
									}}
									aria-haspopup="dialog"
									onClick={(event) => {
										templateTrigger.current = event.currentTarget;
										setSelectedTemplate(t);
									}}
								>
									<span className="block text-xs uppercase tracking-wider">
										{t.audience}
									</span>
									<strong className="mt-1 block">{t.name}</strong>
								</button>
							))}
						</div>
					</section>
					<section className="kinetic-panel space-y-4 bg-[#FFFCEF] p-5">
						<h2 className="text-lg font-bold">Identity & style</h2>
						<label className="block text-sm">
							Display name
							<input
								className={field}
								value={draft.displayName ?? ""}
								maxLength={100}
								onChange={(e) => update({ displayName: e.target.value })}
							/>
						</label>
						<label className="block text-sm">
							Bio
							<textarea
								className={field}
								value={draft.bio ?? ""}
								maxLength={300}
								onChange={(e) => update({ bio: e.target.value })}
							/>
						</label>
						<label className="block text-sm">
							Avatar URL
							<input
								className={field}
								value={draft.avatarUrl ?? ""}
								onChange={(e) => update({ avatarUrl: e.target.value || null })}
							/>
						</label>
						<label className="block text-sm">
							Theme
							<select
								aria-label="Theme"
								className={field}
								value={draft.theme ?? "default"}
								onChange={(e) =>
									update({
										theme: e.target.value,
										pageBackgroundType: "theme",
										accentColor: null,
									})
								}
							>
								{Object.values(themes).map((t) => (
									<option key={t.id} value={t.id}>
										{t.name}
									</option>
								))}
							</select>
						</label>
						<div className="grid grid-cols-2 gap-3">
							<label className="text-sm">
								Typography
								<select
									aria-label="Typography"
									className={field}
									value={draft.fontFamily}
									onChange={(e) => update({ fontFamily: e.target.value })}
								>
									{Object.keys(FONT_OPTIONS).map((f) => (
										<option key={f} value={f}>
											{f}
										</option>
									))}
								</select>
							</label>
							<label className="text-sm">
								Button shape
								<select
									aria-label="Button shape"
									className={field}
									value={draft.buttonStyle}
									onChange={(e) => update({ buttonStyle: e.target.value })}
								>
									{BUTTON_STYLES.map((s) => (
										<option key={s}>{s}</option>
									))}
								</select>
							</label>
						</div>
						<label className="block text-sm">
							Accent color
							<input
								type="color"
								className="ml-3 h-8 w-16 align-middle"
								value={
									draft.accentColor ?? themes[draft.theme ?? "default"].accent
								}
								onChange={(e) => update({ accentColor: e.target.value })}
							/>
						</label>
						<p className="text-xs">
							Custom photo backgrounds remain available in Profile settings.
						</p>
					</section>
					<section className="kinetic-panel space-y-4 bg-[#FFFCEF] p-5">
						<h2 className="text-lg font-bold">Content blocks</h2>
						<p className="text-xs">
							Add context before your links or between them. Up to 30 blocks.
						</p>
						{draft.contentBlocks.map((b, index) => (
							<div
								key={b.id}
								className="space-y-3 rounded-xl border border-black/30 bg-white p-4"
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<strong className="text-sm">Block {index + 1}</strong>
									<div className="flex gap-2">
										<button
											type="button"
											disabled={index === 0}
											aria-label={`Move block ${index + 1} up`}
											onClick={() => {
												const blocks = [...draft.contentBlocks];
												[blocks[index - 1], blocks[index]] = [
													blocks[index],
													blocks[index - 1],
												];
												update({ contentBlocks: blocks });
											}}
										>
											↑
										</button>
										<button
											type="button"
											className="min-h-10 px-2 text-sm font-semibold"
											aria-label={`Duplicate block ${index + 1}`}
											disabled={draft.contentBlocks.length >= 30}
											onClick={() =>
												update({
													contentBlocks: duplicateBlock(
														draft.contentBlocks,
														b.id,
														crypto.randomUUID(),
													),
												})
											}
										>
											Duplicate
										</button>
										<button
											type="button"
											aria-label={`Remove block ${index + 1}`}
											onClick={() =>
												update({
													contentBlocks: draft.contentBlocks.filter(
														(x) => x.id !== b.id,
													),
												})
											}
										>
											Remove
										</button>
									</div>
								</div>
								<label className="block text-sm">
									Block type
									<select
										aria-label="Block type"
										className={field}
										value={b.type}
										onChange={(e) =>
											updateBlock(b.id, {
												type: e.target.value as ContentBlock["type"],
											})
										}
									>
										{BLOCK_TYPES.map((t) => (
											<option key={t}>{t}</option>
										))}
									</select>
								</label>
								<label className="block text-sm">
									{b.type === "faq"
										? "Question"
										: b.type === "quote"
											? "Attribution"
											: "Title / image alt text"}
									<input
										className={field}
										value={b.title}
										maxLength={100}
										onChange={(e) =>
											updateBlock(b.id, { title: e.target.value })
										}
									/>
								</label>
								<label className="block text-sm">
									{b.type === "faq"
										? "Answer"
										: b.type === "quote"
											? "Quote"
											: "Text"}
									<textarea
										className={field}
										value={b.body}
										maxLength={2000}
										onChange={(e) =>
											updateBlock(b.id, { body: e.target.value })
										}
									/>
								</label>
								{["image", "video", "contact", "quote"].includes(b.type) && (
									<label className="block text-sm">
										{b.type === "quote"
											? "Source URL (optional)"
											: b.type === "contact"
												? "Contact email"
												: b.type === "video"
													? "YouTube or Vimeo URL"
													: "Image URL"}
										<input
											className={field}
											value={b.url}
											onChange={(e) =>
												updateBlock(b.id, { url: e.target.value })
											}
										/>
									</label>
								)}
								<label className="block text-sm">
									Placement
									<select
										aria-label="Placement"
										className={field}
										value={b.afterLinkId ?? ""}
										onChange={(e) =>
											updateBlock(b.id, { afterLinkId: e.target.value || null })
										}
									>
										<option value="">Before the links</option>
										{draftLinks.map((l) => (
											<option key={l.id} value={l.id}>
												After: {l.title}
											</option>
										))}
									</select>
								</label>
							</div>
						))}
						<Button
							variant="outline"
							disabled={draft.contentBlocks.length >= 30}
							onClick={() =>
								update({
									contentBlocks: [
										...draft.contentBlocks,
										{
											id: crypto.randomUUID(),
											type: "text",
											title: "",
											body: "",
											url: "",
											afterLinkId: null,
										},
									],
								})
							}
						>
							Add content block
						</Button>
					</section>
					<details className="kinetic-panel bg-[#FFFCEF] p-5">
						<summary className="cursor-pointer font-bold">
							Preview link edits
						</summary>
						<p className="my-3 text-xs">
							Edit titles and destinations here. Publish saves these together
							with the design.
						</p>
						{draftLinks.map((l) => (
							<div key={l.id} className="my-4 space-y-2">
								<label className="block text-sm">
									Title: {l.title}
									<input
										className={field}
										value={l.title}
										onChange={(e) =>
											setDraftLinks((v) =>
												v.map((x) =>
													x.id === l.id ? { ...x, title: e.target.value } : x,
												),
											)
										}
									/>
								</label>
								<label className="block text-sm">
									Destination
									<input
										className={field}
										value={l.url}
										onChange={(e) =>
											setDraftLinks((v) =>
												v.map((x) =>
													x.id === l.id ? { ...x, url: e.target.value } : x,
												),
											)
										}
									/>
								</label>
							</div>
						))}
					</details>
					<Button
						variant="outline"
						disabled={!dirty}
						onClick={() => {
							const original = JSON.parse(saved);
							history.set({ profile: original.profile, links: original.links });
						}}
					>
						Discard draft
					</Button>
				</fieldset>
				<aside className="min-w-0 xl:sticky xl:top-6">
					<div className="mb-3 flex items-center justify-between">
						<p className="text-xs font-bold uppercase tracking-widest">
							Live preview · {dirty ? "Unpublished changes" : "Published"}
						</p>
						<div className="flex gap-2">
							{(["phone", "desktop"] as const).map((d) => (
								<button
									type="button"
									key={d}
									aria-pressed={device === d}
									className="rounded-lg border border-black px-3 py-2 text-xs"
									onClick={() => setDevice(d)}
								>
									{d === "phone" ? "Phone" : "Desktop"}
								</button>
							))}
						</div>
					</div>
					<div
						className="max-h-[80vh] overflow-auto rounded-[28px] border-4 border-black bg-white shadow-[8px_8px_0_0_#11110F]"
						data-testid="live-preview"
					>
						<div
							style={{
								width: device === "desktop" ? 960 : "100%",
								maxWidth: device === "phone" ? 390 : undefined,
								zoom: device === "desktop" ? 0.5 : 1,
								margin: "auto",
							}}
						>
							<PublicProfilePage data={preview} preview />
						</div>
					</div>
					<p className="mt-3 text-xs">
						Paused, scheduled, and expired links are excluded. Preview
						interactions do not record clicks.
					</p>
				</aside>
			</div>
		</div>
	);
}
