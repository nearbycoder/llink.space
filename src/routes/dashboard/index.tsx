import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	Check,
	Copy,
	Eye,
	EyeOff,
	FolderPlus,
	Link2,
	Plus,
	Search,
	X,
} from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { LinksLoadingState } from "#/components/dashboard/DashboardLoading";
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
import {
	dashboardLinkStats,
	filterDashboardLinks,
	type LinkStatusFilter,
} from "#/lib/dashboard-tools";
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
			initialProfile: result.profile,
			initialLayout: {
				links: result.links,
				sections: result.sections,
			},
		};
	},
	pendingMs: 150,
	pendingMinMs: 300,
	pendingComponent: LinksLoadingState,
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

const LINK_STAT_CARDS = [
	{ id: "total", label: "Total links", Icon: Link2, color: "bg-[#F5FF7B]" },
	{ id: "live", label: "Live", Icon: Eye, color: "bg-[#8AE1E7]" },
	{ id: "paused", label: "Paused", Icon: EyeOff, color: "bg-[#F2B7E2]" },
] as const;

function errorMessage(error: unknown, fallback: string) {
	return error instanceof Error && error.message ? error.message : fallback;
}

async function copyTextToClipboard(value: string) {
	if (navigator.clipboard) {
		try {
			await navigator.clipboard.writeText(value);
			return;
		} catch {
			// Fall back for browsers that expose Clipboard but deny it by policy.
		}
	}

	const textarea = document.createElement("textarea");
	textarea.value = value;
	textarea.setAttribute("readonly", "");
	textarea.style.position = "fixed";
	textarea.style.opacity = "0";
	document.body.append(textarea);
	textarea.select();
	const copied = document.execCommand("copy");
	textarea.remove();
	if (!copied) throw new Error("Clipboard unavailable");
}

function DashboardPage() {
	const { initialLayout, initialProfile } = Route.useLoaderData();
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
	const [linkQuery, setLinkQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<LinkStatusFilter>("all");
	const [sectionFilter, setSectionFilter] = useState("all");
	const [copiedProfileUrl, setCopiedProfileUrl] = useState(false);
	const [actionLinkId, setActionLinkId] = useState<string | null>(null);
	const createSectionInputRef = useRef<HTMLInputElement | null>(null);
	const copyResetTimerRef = useRef<number | null>(null);

	const focusAndSelectCreateSectionInput = useCallback(() => {
		const node = createSectionInputRef.current;
		if (!node) return;
		node.focus();
		node.setSelectionRange(0, node.value.length);
	}, []);

	const linksQueryOptions = trpc.links.list.queryOptions();
	const { data: layout = initialLayout, refetch: refetchLayout } = useQuery({
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
	const stats = useMemo(() => dashboardLinkStats(layout.links), [layout.links]);
	const filteredLinks = useMemo(
		() =>
			filterDashboardLinks(layout.links, {
				query: linkQuery,
				status: statusFilter,
				sectionId: sectionFilter,
			}),
		[layout.links, linkQuery, sectionFilter, statusFilter],
	);
	const visibleSections = useMemo(() => {
		if (sectionFilter === "all") return layout.sections;
		if (sectionFilter === "unsectioned") return [];
		return layout.sections.filter((section) => section.id === sectionFilter);
	}, [layout.sections, sectionFilter]);
	const hasActiveFilters =
		linkQuery.trim().length > 0 ||
		statusFilter !== "all" ||
		sectionFilter !== "all";

	useEffect(() => {
		setIsHydrated(true);
		return () => {
			if (copyResetTimerRef.current !== null) {
				window.clearTimeout(copyResetTimerRef.current);
			}
		};
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
		try {
			await addLink.mutateAsync(data);
			await refreshLayout();
			setShowAddLink(false);
			toast.success("Link added");
		} catch (error) {
			toast.error(errorMessage(error, "Could not add the link"));
		}
	};

	const handleUpdateLink = async (data: LinkFormData) => {
		if (!editingLink) return;
		try {
			await updateLink.mutateAsync({
				id: editingLink.id,
				...data,
				iconUrl: data.iconUrl ?? null,
			});
			await refreshLayout();
			setEditingLink(null);
			toast.success("Link updated");
		} catch (error) {
			toast.error(errorMessage(error, "Could not update the link"));
		}
	};

	const handleToggleLink = async (link: DashboardLink) => {
		setActionLinkId(link.id);
		try {
			const nextIsActive = link.isActive === false;
			await updateLink.mutateAsync({ id: link.id, isActive: nextIsActive });
			await refreshLayout();
			toast.success(nextIsActive ? "Link published" : "Link paused");
		} catch (error) {
			toast.error(errorMessage(error, "Could not update link visibility"));
		} finally {
			setActionLinkId(null);
		}
	};

	const handleDuplicateLink = async (link: DashboardLink) => {
		setActionLinkId(link.id);
		try {
			await addLink.mutateAsync({
				title: `${link.title} copy`.slice(0, 100),
				url: link.url,
				description: link.description ?? undefined,
				iconUrl:
					link.iconUrl && isLinkIconKey(link.iconUrl)
						? link.iconUrl
						: undefined,
				iconBgColor: link.iconBgColor ?? undefined,
				isActive: link.isActive !== false,
				sectionId: link.sectionId,
			});
			await refreshLayout();
			toast.success("Link duplicated");
		} catch (error) {
			toast.error(errorMessage(error, "Could not duplicate the link"));
		} finally {
			setActionLinkId(null);
		}
	};

	const handleCopyProfileUrl = async () => {
		const profileUrl = `${window.location.origin}/u/${initialProfile.username}`;
		try {
			await copyTextToClipboard(profileUrl);
			setCopiedProfileUrl(true);
			toast.success("Public page URL copied");
			if (copyResetTimerRef.current !== null) {
				window.clearTimeout(copyResetTimerRef.current);
			}
			copyResetTimerRef.current = window.setTimeout(
				() => setCopiedProfileUrl(false),
				1800,
			);
		} catch {
			toast.error("Could not copy the public page URL");
		}
	};

	const clearFilters = () => {
		setLinkQuery("");
		setStatusFilter("all");
		setSectionFilter("all");
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
		try {
			await deleteLink.mutateAsync({ id: linkDeleteState.id });
			await refreshLayout();
			setLinkDeleteState(null);
			toast.success("Link deleted");
		} catch (error) {
			toast.error(errorMessage(error, "Could not delete the link"));
		}
	};

	const handleLayoutChange = async (payload: LayoutReorderPayload) => {
		try {
			await reorderLinks.mutateAsync(payload);
			await refreshLayout();
		} catch (error) {
			toast.error(errorMessage(error, "Could not save the new order"));
			throw error;
		}
	};

	const openCreateSectionDialog = (state: SectionCreateState) => {
		setSectionCreateState(state);
		setSectionTitleDraft("New section");
	};

	const handleSubmitSectionCreate = async () => {
		if (!sectionCreateState) return;
		const title = sectionTitleDraft.trim();
		if (!title) return;

		try {
			await createSection.mutateAsync({
				title,
				sourceSectionId: sectionCreateState.sourceSectionId,
				splitIndex: sectionCreateState.splitIndex,
			});
			await refreshLayout();
			setSectionCreateState(null);
			toast.success("Section created");
		} catch (error) {
			toast.error(errorMessage(error, "Could not create the section"));
		}
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
		try {
			await updateSection.mutateAsync({ id: editingSection.id, title });
			await refreshLayout();
			setEditingSection(null);
			toast.success("Section renamed");
		} catch (error) {
			toast.error(errorMessage(error, "Could not rename the section"));
		}
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
		try {
			await deleteSection.mutateAsync({ id: sectionDeleteState.id });
			await refreshLayout();
			setSectionDeleteState(null);
			toast.success("Section deleted; its links are now unsectioned");
		} catch (error) {
			toast.error(errorMessage(error, "Could not delete the section"));
		}
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

			<div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
				{LINK_STAT_CARDS.map(({ id, label, Icon, color }) => (
					<div
						key={id}
						data-testid={`link-stat-${id}`}
						className="kinetic-panel flex items-center gap-2 p-3 sm:p-4"
					>
						<span
							className={`hidden rounded-lg border-2 border-black p-1.5 sm:inline-flex ${color}`}
						>
							<Icon className="h-4 w-4" />
						</span>
						<div>
							<p className="text-xl font-bold leading-none text-[#11110F]">
								{stats[id]}
							</p>
							<p className="mt-1 text-[11px] font-semibold text-[#5B5648] sm:text-xs">
								{label}
							</p>
						</div>
					</div>
				))}
			</div>

			<div className="kinetic-panel mb-5 space-y-3 p-3 sm:p-4">
				<div className="flex flex-col gap-2 sm:flex-row">
					<div className="relative min-w-0 flex-1">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6A675C]" />
						<Input
							value={linkQuery}
							onChange={(event) => setLinkQuery(event.target.value)}
							placeholder="Search title, URL, or description"
							aria-label="Search links"
							className="pl-9"
						/>
					</div>
					<select
						aria-label="Filter links by status"
						value={statusFilter}
						onChange={(event) =>
							setStatusFilter(event.target.value as LinkStatusFilter)
						}
						className="h-10 rounded-xl border-2 border-black bg-white px-3 text-sm font-semibold text-[#11110F]"
					>
						<option value="all">All statuses</option>
						<option value="live">Live only</option>
						<option value="paused">Paused only</option>
					</select>
					<select
						aria-label="Filter links by section"
						value={sectionFilter}
						onChange={(event) => setSectionFilter(event.target.value)}
						className="h-10 rounded-xl border-2 border-black bg-white px-3 text-sm font-semibold text-[#11110F]"
					>
						<option value="all">All sections</option>
						<option value="unsectioned">Unsectioned</option>
						{layout.sections.map((section) => (
							<option key={section.id} value={section.id}>
								{section.title}
							</option>
						))}
					</select>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<p
						className="text-xs font-semibold text-[#5B5648]"
						aria-live="polite"
					>
						Showing {filteredLinks.length} of {layout.links.length} links
					</p>
					<div className="flex gap-2">
						{hasActiveFilters && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={clearFilters}
							>
								<X className="mr-1 h-3.5 w-3.5" /> Clear filters
							</Button>
						)}
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleCopyProfileUrl}
						>
							{copiedProfileUrl ? (
								<Check className="mr-1 h-3.5 w-3.5" />
							) : (
								<Copy className="mr-1 h-3.5 w-3.5" />
							)}
							{copiedProfileUrl ? "Copied" : "Copy page URL"}
						</Button>
					</div>
				</div>
			</div>

			{layout.links.length === 0 && layout.sections.length === 0 ? (
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
			) : filteredLinks.length === 0 && hasActiveFilters ? (
				<div className="kinetic-panel py-12 text-center">
					<Search className="mx-auto h-7 w-7 text-[#6A675C]" />
					<p className="mt-3 text-sm font-semibold text-[#11110F]">
						No matching links
					</p>
					<p className="mt-1 text-xs text-[#6A675C]">
						Try a different search or clear your filters.
					</p>
					<Button
						type="button"
						variant="outline"
						className="mt-4"
						onClick={clearFilters}
					>
						Clear filters
					</Button>
				</div>
			) : (
				<SectionedLinkBoard
					links={filteredLinks}
					sections={visibleSections}
					onLayoutChange={handleLayoutChange}
					onEditLink={(link) => setEditingLink(link)}
					onDeleteLink={handleRequestDeleteLink}
					onToggleLink={handleToggleLink}
					onDuplicateLink={handleDuplicateLink}
					busyLinkId={actionLinkId}
					onCreateSectionAt={openCreateSectionDialog}
					onRenameSection={handleRenameSection}
					onDeleteSection={handleRequestDeleteSection}
					enableDrag={isHydrated && !hasActiveFilters}
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
