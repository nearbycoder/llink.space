import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import type { SetStateAction } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { DesignBackup } from "#/components/dashboard/DesignBackup";
import { PageHeader } from "#/components/dashboard/PageHeader";
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
import { Select } from "#/components/ui/select";
import { useTRPC } from "#/integrations/trpc/react";
import { getDashboardDesign } from "#/lib/auth-server";
import { duplicateBlock } from "#/lib/duplicate-block";
import { EXTENDED_BLOCK_HELP } from "#/lib/extended-blocks";
import { isLinkPublished, localDateInput } from "#/lib/link-publishing";
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
const BEFORE_LINKS = "__before-links";
const BLOCK_TYPE_LABELS: Record<(typeof BLOCK_TYPES)[number], string> = {
	heading: "Heading",
	text: "Text",
	image: "Image",
	video: "Video",
	contact: "Contact",
	faq: "FAQ",
	quote: "Quote",
	event: "Event",
	audio: "Audio",
	button: "Call to action",
	divider: "Divider",
	code: "Code snippet",
	checklist: "Checklist",
	hours: "Business hours",
};
const FONT_LABELS = {
	work: "Modern sans",
	editorial: "Editorial serif",
	mono: "Monospace",
} as const;
const field =
	"mt-1.5 w-full rounded-xl border border-input/60 bg-card px-3.5 py-2 text-base text-foreground transition-[border-color,box-shadow] outline-none hover:border-input focus-visible:border-foreground focus-visible:ring-[3px] focus-visible:ring-signal/20 sm:text-sm";
function DesignStudio() {
	const fieldId = useId();
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
		<div className="dashboard-page px-4 py-6 sm:px-6 md:px-10">
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
								<DialogTitle>Use {selectedTemplate.name}?</DialogTitle>
								<DialogDescription className="leading-relaxed">
									This replaces the theme and content blocks in your draft. Your
									links and profile details stay in place.
								</DialogDescription>
							</DialogHeader>
							<div
								className="rounded-xl border border-border p-5 shadow-sm"
								style={{
									background: themes[selectedTemplate.theme].background,
									color: themes[selectedTemplate.theme].text,
								}}
							>
								<p className="font-mono text-[10.5px] uppercase tracking-[0.08em] opacity-75">
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
			<PageHeader
				eyebrow="Make it yours"
				title="Design studio"
				description="Shape your page, preview every change, then publish."
				actions={
					<>
						{dirty && (
							<span className="inline-flex h-9 items-center gap-2 rounded-full bg-signal-soft px-3.5 text-xs font-semibold text-signal-strong">
								<span
									aria-hidden="true"
									className="size-1.5 rounded-full bg-signal"
								/>
								Unpublished changes
							</span>
						)}
						<Button
							variant="brand"
							onClick={publish}
							disabled={!ready || !dirty || save.isPending}
						>
							{save.isPending ? "Publishing…" : "Publish design"}
						</Button>
					</>
				}
			/>
			<div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
				<fieldset
					disabled={!ready || save.isPending}
					className="min-w-0 space-y-5"
				>
					<div className="surface bg-card p-4">
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
						<p className="mt-2 text-xs text-muted-foreground">
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
					<section className="surface space-y-4 bg-card p-5">
						<h2 className="font-display text-xl font-semibold">
							Start with a template
						</h2>
						<p className="text-xs text-muted-foreground">
							Templates replace the theme and content blocks in your draft. Your
							links stay in place.
						</p>
						<div className="grid grid-cols-2 gap-3">
							{pageTemplates.map((t) => (
								<button
									type="button"
									key={t.id}
									className="group min-h-24 rounded-2xl border border-black/10 p-4 text-left transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-18px_rgb(22_20_15/0.5)]"
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
									<span className="block font-mono text-[10.5px] uppercase tracking-[0.08em] opacity-75">
										{t.audience}
									</span>
									<strong className="mt-6 block font-display text-lg font-semibold">
										{t.name}
									</strong>
								</button>
							))}
						</div>
					</section>
					<section className="surface space-y-4 bg-card p-5">
						<h2 className="font-display text-xl font-semibold">
							Identity & style
						</h2>
						<label className="block text-sm font-medium">
							Display name
							<input
								className={field}
								value={draft.displayName ?? ""}
								maxLength={100}
								onChange={(e) => update({ displayName: e.target.value })}
							/>
						</label>
						<label className="block text-sm font-medium">
							Bio
							<textarea
								className={field}
								value={draft.bio ?? ""}
								maxLength={300}
								onChange={(e) => update({ bio: e.target.value })}
							/>
						</label>
						<label className="block text-sm font-medium">
							Avatar URL
							<input
								className={field}
								value={draft.avatarUrl ?? ""}
								onChange={(e) => update({ avatarUrl: e.target.value || null })}
							/>
						</label>
						<div className="block text-sm font-medium">
							<label htmlFor={`${fieldId}-theme`}>Theme</label>
							<Select
								id={`${fieldId}-theme`}
								aria-label="Theme"
								className="mt-1.5"
								value={draft.theme ?? "default"}
								onValueChange={(theme) =>
									update({
										theme,
										pageBackgroundType: "theme",
										accentColor: null,
									})
								}
								options={Object.values(themes).map((t) => ({
									value: t.id,
									label: t.name,
									icon: (
										<span
											className="size-4 rounded-full border border-black/10"
											style={{ background: t.background }}
										/>
									),
								}))}
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="text-sm font-medium">
								<label htmlFor={`${fieldId}-font`}>Typography</label>
								<Select
									id={`${fieldId}-font`}
									aria-label="Typography"
									className="mt-1.5"
									value={draft.fontFamily}
									onValueChange={(fontFamily) => update({ fontFamily })}
									options={Object.entries(FONT_OPTIONS).map(
										([key, fontFamily]) => ({
											value: key,
											textValue: FONT_LABELS[key as keyof typeof FONT_LABELS],
											label: (
												<span style={{ fontFamily }}>
													{FONT_LABELS[key as keyof typeof FONT_LABELS]}
												</span>
											),
										}),
									)}
								/>
							</div>
							<div className="text-sm font-medium">
								<label htmlFor={`${fieldId}-button`}>Button shape</label>
								<Select
									id={`${fieldId}-button`}
									aria-label="Button shape"
									className="mt-1.5"
									value={draft.buttonStyle}
									onValueChange={(buttonStyle) => update({ buttonStyle })}
									options={BUTTON_STYLES.map((style) => ({
										value: style,
										label: style.charAt(0).toUpperCase() + style.slice(1),
										icon: (
											<span
												className="h-3 w-4 border-[1.5px] border-current"
												style={{
													borderRadius:
														style === "pill" ? 999 : style === "square" ? 0 : 4,
												}}
											/>
										),
									}))}
								/>
							</div>
						</div>
						<label className="block text-sm font-medium">
							Accent color
							<input
								type="color"
								className="ml-3 h-9 w-16 cursor-pointer rounded-lg border border-border bg-card p-1 align-middle"
								value={
									draft.accentColor ?? themes[draft.theme ?? "default"].accent
								}
								onChange={(e) => update({ accentColor: e.target.value })}
							/>
						</label>
						<p className="text-xs text-muted-foreground">
							Custom photo backgrounds remain available in Profile settings.
						</p>
					</section>
					<section className="surface space-y-4 bg-card p-5">
						<h2 className="font-display text-xl font-semibold">
							Content blocks
						</h2>
						<p className="text-xs text-muted-foreground">
							Add context before your links or between them. Up to 30 blocks.
						</p>
						{draft.contentBlocks.map((b, index) => (
							<div
								key={b.id}
								className="space-y-3 rounded-2xl border border-border bg-muted/50 p-4"
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
								<div className="block text-sm font-medium">
									<label htmlFor={`${fieldId}-${b.id}-type`}>Block type</label>
									<Select
										id={`${fieldId}-${b.id}-type`}
										aria-label="Block type"
										className="mt-1.5"
										value={b.type}
										options={BLOCK_TYPES.map((type) => ({
											value: type,
											label: BLOCK_TYPE_LABELS[type],
										}))}
										onValueChange={(type) =>
											updateBlock(b.id, {
												type: type as ContentBlock["type"],
												...(type === "hours"
													? {
															timeZone:
																b.timeZone ||
																Intl.DateTimeFormat().resolvedOptions()
																	.timeZone,
														}
													: {}),
											})
										}
									/>
								</div>
								{b.type in EXTENDED_BLOCK_HELP && (
									<p className="text-xs text-muted-foreground">
										{
											EXTENDED_BLOCK_HELP[
												b.type as keyof typeof EXTENDED_BLOCK_HELP
											]
										}
									</p>
								)}
								{b.type === "hours" && (
									<label className="block text-sm font-medium">
										Hours time zone
										<input
											className={field}
											value={b.timeZone ?? ""}
											placeholder="America/Chicago"
											onChange={(e) =>
												updateBlock(b.id, { timeZone: e.target.value })
											}
										/>
									</label>
								)}
								<label className="block text-sm font-medium">
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
								<label className="block text-sm font-medium">
									{b.type === "faq"
										? "Answer"
										: b.type === "quote"
											? "Quote"
											: "Text"}
									<textarea
										className={field}
										value={b.body}
										maxLength={2000}
										placeholder={
											b.type === "checklist"
												? "- [ ] First item\n- [x] Completed item"
												: b.type === "hours"
													? "Monday | 09:00-17:00\nSunday | Closed"
													: undefined
										}
										onChange={(e) =>
											updateBlock(b.id, { body: e.target.value })
										}
									/>
								</label>
								{[
									"image",
									"video",
									"contact",
									"quote",
									"audio",
									"button",
								].includes(b.type) && (
									<label className="block text-sm font-medium">
										{b.type === "quote"
											? "Source URL (optional)"
											: b.type === "contact"
												? "Contact email"
												: b.type === "video"
													? "YouTube or Vimeo URL"
													: b.type === "audio"
														? "Audio file URL"
														: b.type === "button"
															? "Button destination"
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
								{b.type === "event" && (
									<div className="space-y-3">
										<p className="text-xs text-muted-foreground">
											Enter times in your local time zone. Visitors can download
											a calendar event.
										</p>
										<label className="block text-sm font-medium">
											Event start
											<input
												type="datetime-local"
												className={field}
												value={localDateInput(b.startsAt)}
												onChange={(e) =>
													updateBlock(b.id, {
														startsAt: e.target.value
															? new Date(e.target.value).toISOString()
															: undefined,
													})
												}
											/>
										</label>
										<label className="block text-sm font-medium">
											Event end (optional)
											<input
												type="datetime-local"
												className={field}
												value={localDateInput(b.endsAt)}
												onChange={(e) =>
													updateBlock(b.id, {
														endsAt: e.target.value
															? new Date(e.target.value).toISOString()
															: undefined,
													})
												}
											/>
										</label>
										<label className="block text-sm font-medium">
											Event details URL (optional)
											<input
												className={field}
												value={b.url}
												onChange={(e) =>
													updateBlock(b.id, { url: e.target.value })
												}
											/>
										</label>
									</div>
								)}
								<div className="block text-sm font-medium">
									<label htmlFor={`${fieldId}-${b.id}-placement`}>
										Placement
									</label>
									<Select
										id={`${fieldId}-${b.id}-placement`}
										aria-label="Placement"
										className="mt-1.5"
										value={b.afterLinkId ?? BEFORE_LINKS}
										onValueChange={(value) =>
											updateBlock(b.id, {
												afterLinkId: value === BEFORE_LINKS ? null : value,
											})
										}
										options={[
											{ value: BEFORE_LINKS, label: "Before the links" },
											...draftLinks.map((l) => ({
												value: l.id,
												label: `After: ${l.title}`,
											})),
										]}
									/>
								</div>
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
					<details className="surface bg-card p-5">
						<summary className="cursor-pointer font-display text-xl font-semibold">
							Preview link edits
						</summary>
						<p className="my-3 text-xs text-muted-foreground">
							Edit titles and destinations here. Publish saves these together
							with the design.
						</p>
						{draftLinks.map((l) => (
							<div key={l.id} className="my-4 space-y-2">
								<label className="block text-sm font-medium">
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
								<label className="block text-sm font-medium">
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
					<div className="mb-3 flex items-center justify-between gap-3">
						<p className="eyebrow flex items-center gap-2">
							<span
								aria-hidden="true"
								className={`size-1.5 rounded-full ${dirty ? "bg-signal" : "bg-success"}`}
							/>
							Live preview · {dirty ? "Unpublished changes" : "Published"}
						</p>
						<div className="flex rounded-full border border-border bg-card p-0.5">
							{(["phone", "desktop"] as const).map((d) => (
								<button
									type="button"
									key={d}
									aria-pressed={device === d}
									className="rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors aria-pressed:bg-primary aria-pressed:text-primary-foreground"
									onClick={() => setDevice(d)}
								>
									{d === "phone" ? "Phone" : "Desktop"}
								</button>
							))}
						</div>
					</div>
					<div
						className="max-h-[80vh] overflow-auto rounded-[1.75rem] border border-border bg-[radial-gradient(circle,rgb(22_20_15/0.09)_1px,transparent_1px)] bg-muted/60 [background-size:16px_16px] p-3 sm:p-5"
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
							<div className="overflow-hidden rounded-[1.5rem] border border-border shadow-[0_24px_60px_-30px_rgb(22_20_15/0.45)]">
								<PublicProfilePage data={preview} preview />
							</div>
						</div>
					</div>
					<p className="mt-3 text-xs text-muted-foreground">
						Paused, scheduled, and expired links are excluded. Preview
						interactions do not record clicks.
					</p>
				</aside>
			</div>
		</div>
	);
}
