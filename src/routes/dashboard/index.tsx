import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { FolderPlus, Plus } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LinkFormData } from "#/components/dashboard/LinkForm";
import { LinkForm } from "#/components/dashboard/LinkForm";
import {
	type DashboardLink,
	type DashboardSection,
	type LayoutReorderPayload,
	SectionedLinkBoard,
} from "#/components/dashboard/SectionedLinkBoard";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { useTRPC } from "#/integrations/trpc/react";
import { getDashboardLinks } from "#/lib/auth-server";
import { isLinkIconKey } from "#/lib/link-icon-keys";

export const Route = createFileRoute("/dashboard/")({
	headers: () => ({
		"cache-control": "private, no-store, no-cache, must-revalidate, max-age=0",
	}),
	loader: async () => {
		const result = await getDashboardLinks();
		if (result.status === "unauthenticated") {
			throw redirect({ to: "/sign-in" });
		}
		if (result.status === "no-profile") {
			throw redirect({ to: "/onboarding" });
		}
		return {
			initialLayout: {
				links: result.links,
				sections: result.sections,
			},
		};
	},
	component: DashboardPage,
});

interface SectionCreateState {
	sourceSectionId: string | null;
	splitIndex: number;
}

interface SectionDeleteState {
	id: string;
	title: string;
}

interface LinkDeleteState {
	id: string;
	title: string;
}

function DashboardPage() {
	const { initialLayout } = Route.useLoaderData();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [isHydrated, setIsHydrated] = useState(false);
	const [showAddLink, setShowAddLink] = useState(false);
	const [editingLink, setEditingLink] = useState<DashboardLink | null>(null);
	const [sectionCreateState, setSectionCreateState] =
		useState<SectionCreateState | null>(null);
	const [sectionTitleDraft, setSectionTitleDraft] = useState("New section");
	const [editingSection, setEditingSection] = useState<DashboardSection | null>(
		null,
	);
	const [editingSectionTitle, setEditingSectionTitle] = useState("");
	const [sectionDeleteState, setSectionDeleteState] =
		useState<SectionDeleteState | null>(null);
	const [linkDeleteState, setLinkDeleteState] =
		useState<LinkDeleteState | null>(null);
	const createSectionInputRef = useRef<HTMLInputElement | null>(null);

	const focusAndSelectCreateSectionInput = useCallback(() => {
		const node = createSectionInputRef.current;
		if (!node) return;
		node.focus();
		node.setSelectionRange(0, node.value.length);
	}, []);

	const linksQueryOptions = trpc.links.list.queryOptions();
	const {
		data: layout = initialLayout,
		isLoading,
		refetch: refetchLayout,
	} = useQuery({
		...linksQueryOptions,
		initialData: initialLayout,
	});

	const addLink = useMutation(trpc.links.add.mutationOptions());
	const updateLink = useMutation(trpc.links.update.mutationOptions());
	const deleteLink = useMutation(trpc.links.delete.mutationOptions());
	const reorderLinks = useMutation(trpc.links.reorder.mutationOptions());
	const createSection = useMutation(trpc.links.createSection.mutationOptions());
	const updateSection = useMutation(trpc.links.updateSection.mutationOptions());
	const deleteSection = useMutation(trpc.links.deleteSection.mutationOptions());

	useEffect(() => {
		setIsHydrated(true);
	}, []);

	useEffect(() => {
		if (sectionCreateState === null) return;
		const rafId = window.requestAnimationFrame(() => {
			focusAndSelectCreateSectionInput();
		});
		return () => window.cancelAnimationFrame(rafId);
	}, [sectionCreateState, focusAndSelectCreateSectionInput]);

	const refreshLayout = async () => {
		await queryClient.invalidateQueries({
			queryKey: linksQueryOptions.queryKey,
			exact: true,
		});
		await refetchLayout();
	};

	const handleAddLink = async (data: LinkFormData) => {
		await addLink.mutateAsync(data);
		await refreshLayout();
		setShowAddLink(false);
	};

	const handleUpdateLink = async (data: LinkFormData) => {
		if (!editingLink) return;
		await updateLink.mutateAsync({
			id: editingLink.id,
			...data,
			iconUrl: data.iconUrl ?? null,
		});
		await refreshLayout();
		setEditingLink(null);
	};

	const handleRequestDeleteLink = (id: string) => {
		const link = layout.links.find((item) => item.id === id);
		if (!link) return;
		setLinkDeleteState({
			id: link.id,
			title: link.title,
		});
	};

	const handleConfirmDeleteLink = async () => {
		if (!linkDeleteState) return;
		await deleteLink.mutateAsync({ id: linkDeleteState.id });
		await refreshLayout();
		setLinkDeleteState(null);
	};

	const handleLayoutChange = async (payload: LayoutReorderPayload) => {
		await reorderLinks.mutateAsync(payload);
		await refreshLayout();
	};

	const openCreateSectionDialog = (state: SectionCreateState) => {
		setSectionCreateState(state);
		setSectionTitleDraft("New section");
	};

	const handleSubmitSectionCreate = async () => {
		if (!sectionCreateState) return;
		const title = sectionTitleDraft.trim();
		if (!title) return;

		await createSection.mutateAsync({
			title,
			sourceSectionId: sectionCreateState.sourceSectionId,
			splitIndex: sectionCreateState.splitIndex,
		});
		await refreshLayout();
		setSectionCreateState(null);
	};

	const handleSectionCreateSubmit = async (
		event: FormEvent<HTMLFormElement>,
	) => {
		event.preventDefault();
		await handleSubmitSectionCreate();
	};

	const handleOpenAddSection = () => {
		const unsectionedCount = layout.links.filter(
			(link) => link.sectionId === null,
		).length;
		openCreateSectionDialog({
			sourceSectionId: null,
			splitIndex: unsectionedCount,
		});
	};

	const handleRenameSection = (section: DashboardSection) => {
		setEditingSection(section);
		setEditingSectionTitle(section.title);
	};

	const handleSubmitRenameSection = async () => {
		if (!editingSection) return;
		const title = editingSectionTitle.trim();
		if (!title) return;
		await updateSection.mutateAsync({ id: editingSection.id, title });
		await refreshLayout();
		setEditingSection(null);
	};

	const handleSectionRenameSubmit = async (
		event: FormEvent<HTMLFormElement>,
	) => {
		event.preventDefault();
		await handleSubmitRenameSection();
	};

	const handleRequestDeleteSection = (sectionId: string) => {
		const section = layout.sections.find((item) => item.id === sectionId);
		if (!section) return;
		setSectionDeleteState({
			id: section.id,
			title: section.title,
		});
	};

	const handleConfirmDeleteSection = async () => {
		if (!sectionDeleteState) return;
		await deleteSection.mutateAsync({ id: sectionDeleteState.id });
		await refreshLayout();
		setSectionDeleteState(null);
	};

	const isBusy =
		addLink.isPending ||
		updateLink.isPending ||
		deleteLink.isPending ||
		createSection.isPending ||
		updateSection.isPending ||
		deleteSection.isPending;

	return (
		<div className="max-w-3xl px-4 py-5 sm:px-6 md:p-8">
			<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1
						className="text-2xl text-[#11110F]"
						style={{ fontFamily: "'Archivo Black', sans-serif" }}
					>
						Links
					</h1>
					<p className="mt-1 text-sm text-[#4B4B45]">
						Organize links into sections and drag them where they belong
					</p>
				</div>
				<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
					<Button
						type="button"
						variant="outline"
						onClick={handleOpenAddSection}
						disabled={isBusy}
					>
						<FolderPlus className="mr-1.5 h-4 w-4" />
						Add section
					</Button>
					<Button onClick={() => setShowAddLink(true)} disabled={isBusy}>
						<Plus className="mr-1.5 h-4 w-4" />
						Add link
					</Button>
				</div>
			</div>

			{isLoading ? (
				<div className="space-y-2">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="h-28 animate-pulse rounded-xl border-2 border-black bg-[#FFFCEF]"
						/>
					))}
				</div>
			) : layout.links.length === 0 && layout.sections.length === 0 ? (
				<div className="kinetic-panel py-16 text-center">
					<p className="text-sm text-[#4B4B45]">No links yet</p>
					<Button
						onClick={() => setShowAddLink(true)}
						variant="outline"
						className="mt-4"
					>
						Add your first link
					</Button>
				</div>
			) : (
				<SectionedLinkBoard
					links={layout.links}
					sections={layout.sections}
					onLayoutChange={handleLayoutChange}
					onEditLink={(link) => setEditingLink(link)}
					onDeleteLink={handleRequestDeleteLink}
					onCreateSectionAt={openCreateSectionDialog}
					onRenameSection={handleRenameSection}
					onDeleteSection={handleRequestDeleteSection}
					enableDrag={isHydrated}
				/>
			)}

			<Dialog open={showAddLink} onOpenChange={setShowAddLink}>
				<DialogContent className="top-4 max-h-[calc(100svh-2rem)] translate-y-0 overflow-y-auto overscroll-contain sm:top-[50%] sm:max-h-[calc(100svh-4rem)] sm:max-w-md sm:translate-y-[-50%]">
					<DialogHeader>
						<DialogTitle>Add link</DialogTitle>
					</DialogHeader>
					<LinkForm
						sections={layout.sections}
						onSubmit={handleAddLink}
						onCancel={() => setShowAddLink(false)}
						submitLabel="Add link"
					/>
				</DialogContent>
			</Dialog>

			<Dialog open={!!editingLink} onOpenChange={() => setEditingLink(null)}>
				<DialogContent className="top-4 max-h-[calc(100svh-2rem)] translate-y-0 overflow-y-auto overscroll-contain sm:top-[50%] sm:max-h-[calc(100svh-4rem)] sm:max-w-md sm:translate-y-[-50%]">
					<DialogHeader>
						<DialogTitle>Edit link</DialogTitle>
					</DialogHeader>
					{editingLink && (
						<LinkForm
							defaultValues={{
								title: editingLink.title,
								url: editingLink.url,
								description: editingLink.description ?? "",
								sectionId: editingLink.sectionId ?? "",
								iconUrl:
									editingLink.iconUrl && isLinkIconKey(editingLink.iconUrl)
										? editingLink.iconUrl
										: "",
								iconBgColor: editingLink.iconBgColor ?? "#F5FF7B",
								isActive: editingLink.isActive ?? true,
							}}
							sections={layout.sections}
							onSubmit={handleUpdateLink}
							onCancel={() => setEditingLink(null)}
						/>
					)}
				</DialogContent>
			</Dialog>

			<Dialog
				open={linkDeleteState !== null}
				onOpenChange={(open) => {
					if (!open) {
						setLinkDeleteState(null);
					}
				}}
			>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Delete link?</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<p className="text-sm text-[#4B4B45]">
							<span className="font-semibold text-[#11110F]">
								{linkDeleteState?.title}
							</span>{" "}
							will be permanently removed.
						</p>
						<div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
							<Button
								type="button"
								className="bg-[#B42318] text-white hover:bg-[#8B1B13]"
								onClick={handleConfirmDeleteLink}
								disabled={deleteLink.isPending}
							>
								{deleteLink.isPending ? "Deleting…" : "Delete link"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => setLinkDeleteState(null)}
								disabled={deleteLink.isPending}
							>
								Cancel
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog
				open={sectionCreateState !== null}
				onOpenChange={(open) => {
					if (!open) {
						setSectionCreateState(null);
					}
				}}
			>
				<DialogContent
					className="max-w-md"
					onOpenAutoFocus={(event) => {
						event.preventDefault();
						focusAndSelectCreateSectionInput();
					}}
				>
					<DialogHeader>
						<DialogTitle>Create section</DialogTitle>
					</DialogHeader>
					<form className="space-y-4" onSubmit={handleSectionCreateSubmit}>
						<div className="space-y-1.5">
							<Input
								ref={createSectionInputRef}
								value={sectionTitleDraft}
								onChange={(event) => setSectionTitleDraft(event.target.value)}
								placeholder="Section title"
								maxLength={60}
							/>
						</div>
						<div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
							<Button
								type="submit"
								disabled={!sectionTitleDraft.trim() || createSection.isPending}
							>
								{createSection.isPending ? "Creating…" : "Create"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => setSectionCreateState(null)}
							>
								Cancel
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={editingSection !== null}
				onOpenChange={(open) => {
					if (!open) {
						setEditingSection(null);
					}
				}}
			>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Rename section</DialogTitle>
					</DialogHeader>
					<form className="space-y-4" onSubmit={handleSectionRenameSubmit}>
						<div className="space-y-1.5">
							<Input
								autoFocus
								value={editingSectionTitle}
								onChange={(event) => setEditingSectionTitle(event.target.value)}
								placeholder="Section title"
								maxLength={60}
							/>
						</div>
						<div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
							<Button
								type="submit"
								disabled={
									!editingSectionTitle.trim() || updateSection.isPending
								}
							>
								{updateSection.isPending ? "Saving…" : "Save"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => setEditingSection(null)}
							>
								Cancel
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={sectionDeleteState !== null}
				onOpenChange={(open) => {
					if (!open) {
						setSectionDeleteState(null);
					}
				}}
			>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Delete section?</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<p className="text-sm text-[#4B4B45]">
							<span className="font-semibold text-[#11110F]">
								{sectionDeleteState?.title}
							</span>{" "}
							will be removed, and its links will move to Unsectioned.
						</p>
						<div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
							<Button
								type="button"
								className="bg-[#B42318] text-white hover:bg-[#8B1B13]"
								onClick={handleConfirmDeleteSection}
								disabled={deleteSection.isPending}
							>
								{deleteSection.isPending ? "Deleting…" : "Delete section"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => setSectionDeleteState(null)}
								disabled={deleteSection.isPending}
							>
								Cancel
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
