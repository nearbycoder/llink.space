import {
	closestCorners,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	type UniqueIdentifier,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { LinkIcon } from "#/components/links/LinkIcon";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

const UNSECTIONED_CONTAINER_ID = "container:unsectioned";

type SectionId = string;
type ContainerId = string;

export interface DashboardLink {
	id: string;
	sectionId: string | null;
	title: string;
	url: string;
	description: string | null;
	iconUrl: string | null;
	iconBgColor: string | null;
	isActive: boolean | null;
	sortOrder: number | null;
}

export interface DashboardSection {
	id: string;
	title: string;
	sortOrder: number | null;
}

export interface LayoutReorderPayload {
	sectionOrderIds: string[];
	unsectionedLinkIds: string[];
	sectionLinkOrders: Array<{
		sectionId: string;
		linkIds: string[];
	}>;
}

interface SectionCreateRequest {
	sourceSectionId: string | null;
	splitIndex: number;
}

interface SectionedLinkBoardProps {
	links: DashboardLink[];
	sections: DashboardSection[];
	onLayoutChange: (payload: LayoutReorderPayload) => Promise<void>;
	onEditLink: (link: DashboardLink) => void;
	onDeleteLink: (id: string) => void;
	onCreateSectionAt: (request: SectionCreateRequest) => void;
	onRenameSection: (section: DashboardSection) => void;
	onDeleteSection: (sectionId: string) => void;
	enableDrag?: boolean;
}

function toContainerId(sectionId: SectionId | null): ContainerId {
	return sectionId === null
		? UNSECTIONED_CONTAINER_ID
		: `container:${sectionId}`;
}

function fromContainerId(containerId: string): string | null {
	if (containerId === UNSECTIONED_CONTAINER_ID) return null;
	if (!containerId.startsWith("container:")) return null;
	return containerId.slice("container:".length);
}

function toLinkDragId(linkId: string) {
	return `link:${linkId}`;
}

function fromLinkDragId(id: UniqueIdentifier): string | null {
	if (typeof id !== "string") return null;
	if (!id.startsWith("link:")) return null;
	return id.slice("link:".length);
}

function sortSections(sections: DashboardSection[]) {
	return [...sections].sort((a, b) => {
		const sortOrderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
		if (sortOrderDiff !== 0) return sortOrderDiff;
		return a.id.localeCompare(b.id);
	});
}

function sortLinksByLayout(
	links: DashboardLink[],
	sections: DashboardSection[],
) {
	const sortedSections = sortSections(sections);
	const sectionOrder = new Map(
		sortedSections.map((section, index) => [section.id, index]),
	);
	const fallbackSectionOrder = sortedSections.length + 1;

	return [...links].sort((a, b) => {
		const aSectionOrder =
			a.sectionId === null
				? -1
				: (sectionOrder.get(a.sectionId) ?? fallbackSectionOrder);
		const bSectionOrder =
			b.sectionId === null
				? -1
				: (sectionOrder.get(b.sectionId) ?? fallbackSectionOrder);
		if (aSectionOrder !== bSectionOrder) return aSectionOrder - bSectionOrder;

		const sortOrderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
		if (sortOrderDiff !== 0) return sortOrderDiff;

		return a.id.localeCompare(b.id);
	});
}

function buildContainerMap(
	links: DashboardLink[],
	sections: DashboardSection[],
): Record<ContainerId, DashboardLink[]> {
	const map: Record<ContainerId, DashboardLink[]> = {
		[UNSECTIONED_CONTAINER_ID]: [],
	};

	for (const section of sortSections(sections)) {
		map[toContainerId(section.id)] = [];
	}

	for (const link of sortLinksByLayout(links, sections)) {
		const containerId = toContainerId(link.sectionId);
		if (!map[containerId]) {
			map[containerId] = [];
		}
		map[containerId].push(link);
	}

	return map;
}

function findContainerForLinkId(
	containers: Record<ContainerId, DashboardLink[]>,
	linkId: string,
) {
	for (const [containerId, items] of Object.entries(containers)) {
		if (items.some((item) => item.id === linkId)) {
			return containerId;
		}
	}
	return null;
}

function toLayoutPayload(
	containers: Record<ContainerId, DashboardLink[]>,
	sections: DashboardSection[],
): LayoutReorderPayload {
	const sortedSections = sortSections(sections);

	return {
		sectionOrderIds: sortedSections.map((section) => section.id),
		unsectionedLinkIds: containers[UNSECTIONED_CONTAINER_ID].map(
			(link) => link.id,
		),
		sectionLinkOrders: sortedSections.map((section) => ({
			sectionId: section.id,
			linkIds: (containers[toContainerId(section.id)] ?? []).map(
				(link) => link.id,
			),
		})),
	};
}

function getLayoutSignature(
	links: DashboardLink[],
	sections: DashboardSection[],
) {
	const sortedSections = sortSections(sections);
	const sectionPart = sortedSections
		.map((section) => `${section.id}:${section.sortOrder ?? 0}`)
		.join("|");
	const linkPart = sortLinksByLayout(links, sortedSections)
		.map(
			(link) =>
				`${link.id}:${link.sectionId ?? "unsectioned"}:${link.sortOrder ?? 0}`,
		)
		.join("|");
	return `${sectionPart}__${linkPart}`;
}

interface LinkRowProps {
	link: DashboardLink;
	containerId: ContainerId;
	onEdit: (link: DashboardLink) => void;
	onDelete: (id: string) => void;
	enableDrag: boolean;
}

function LinkRow({
	link,
	containerId,
	onEdit,
	onDelete,
	enableDrag,
}: LinkRowProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: toLinkDragId(link.id),
		data: { containerId },
		disabled: !enableDrag,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"group flex items-center gap-3 rounded-xl border-2 border-black bg-[#FFFCEF] p-4 shadow-[3px_3px_0_0_#11110F]",
				isDragging && "opacity-50",
			)}
		>
			<button
				type="button"
				className={cn(
					"touch-none text-[#6A675C]",
					enableDrag &&
						"cursor-grab hover:text-[#11110F] active:cursor-grabbing",
				)}
				disabled={!enableDrag}
				{...attributes}
				{...listeners}
			>
				<GripVertical className="h-4 w-4" />
			</button>

			<div className="min-w-0 flex-1">
				<div className="flex items-start gap-3">
					<LinkIcon iconUrl={link.iconUrl} iconBgColor={link.iconBgColor} />
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<span className="truncate text-sm font-medium text-[#11110F]">
								{link.title}
							</span>
							{!link.isActive && (
								<Badge variant="secondary" className="shrink-0 text-xs">
									Hidden
								</Badge>
							)}
						</div>
						<span className="block truncate text-xs text-[#4B4B45]">
							{link.url}
						</span>
						{link.description && (
							<span className="mt-0.5 block truncate text-xs text-[#6A675C]">
								{link.description}
							</span>
						)}
					</div>
				</div>
			</div>

			<div className="pointer-events-none flex gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
				<Button
					variant="ghost"
					size="sm"
					className="h-8 w-8 p-0"
					onClick={() => onEdit(link)}
				>
					<Pencil className="h-3.5 w-3.5" />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className="h-8 w-8 p-0 text-[#B42318] hover:bg-[#FFD9CF] hover:text-[#7E1612]"
					onClick={() => onDelete(link.id)}
				>
					<Trash2 className="h-3.5 w-3.5" />
				</Button>
			</div>
		</div>
	);
}

interface InsertionRailProps {
	onClick: () => void;
}

function InsertionRail({ onClick }: InsertionRailProps) {
	return (
		<div className="group/rail relative py-2">
			<div className="border-t border-dashed border-black/30" />
			<button
				type="button"
				onClick={onClick}
				className="absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-black bg-[#FFF7A8] px-2 py-0.5 text-[10px] font-semibold text-[#11110F] opacity-0 shadow-[2px_2px_0_0_#11110F] transition-all hover:-translate-y-[55%] group-hover/rail:opacity-100 focus-visible:opacity-100"
			>
				<Plus className="h-3 w-3" />
				Create section here
			</button>
		</div>
	);
}

interface SectionColumnProps {
	title: string;
	description: string;
	containerId: ContainerId;
	links: DashboardLink[];
	onEditLink: (link: DashboardLink) => void;
	onDeleteLink: (id: string) => void;
	onCreateSectionAt: (splitIndex: number) => void;
	onRenameSection?: () => void;
	onDeleteSection?: () => void;
	enableDrag: boolean;
}

function SectionColumn({
	title,
	description,
	containerId,
	links,
	onEditLink,
	onDeleteLink,
	onCreateSectionAt,
	onRenameSection,
	onDeleteSection,
	enableDrag,
}: SectionColumnProps) {
	const { isOver, setNodeRef } = useDroppable({ id: containerId });

	return (
		<section
			ref={setNodeRef}
			className={cn(
				"rounded-2xl border-2 border-black bg-[#FFFCED] p-4 shadow-[4px_4px_0_0_#11110F] transition-colors",
				isOver && enableDrag && "bg-[#FFF7A8]",
			)}
		>
			<div className="mb-3 flex items-start justify-between gap-3">
				<div>
					<h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[#11110F]">
						{title}
					</h3>
					<p className="text-xs text-[#5B5648]">{description}</p>
				</div>
				{onRenameSection && onDeleteSection && (
					<div className="flex gap-1">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-7 w-7 p-0"
							onClick={onRenameSection}
						>
							<Pencil className="h-3.5 w-3.5" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-7 w-7 p-0 text-[#B42318] hover:bg-[#FFD9CF] hover:text-[#7E1612]"
							onClick={onDeleteSection}
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					</div>
				)}
			</div>

			<SortableContext
				items={links.map((link) => toLinkDragId(link.id))}
				strategy={verticalListSortingStrategy}
			>
				{links.length > 0 ? (
					<div className="space-y-1">
						{links.map((link, index) => (
							<Fragment key={link.id}>
								<LinkRow
									link={link}
									containerId={containerId}
									onEdit={onEditLink}
									onDelete={onDeleteLink}
									enableDrag={enableDrag}
								/>
								{index < links.length - 1 ? (
									<InsertionRail onClick={() => onCreateSectionAt(index + 1)} />
								) : null}
							</Fragment>
						))}
					</div>
				) : (
					<div className="rounded-xl border-2 border-dashed border-black/30 bg-white/80 px-3 py-4 text-center text-xs text-[#5B5648]">
						{enableDrag ? "Drop links here" : "No links in this section yet"}
					</div>
				)}
			</SortableContext>
		</section>
	);
}

export function SectionedLinkBoard({
	links,
	sections,
	onLayoutChange,
	onEditLink,
	onDeleteLink,
	onCreateSectionAt,
	onRenameSection,
	onDeleteSection,
	enableDrag = true,
}: SectionedLinkBoardProps) {
	const orderedSections = useMemo(() => sortSections(sections), [sections]);
	const incomingLayoutSignature = useMemo(
		() => getLayoutSignature(links, orderedSections),
		[links, orderedSections],
	);
	const [containerLinks, setContainerLinks] = useState<
		Record<ContainerId, DashboardLink[]>
	>(() => buildContainerMap(links, orderedSections));
	const lastHydratedSignatureRef = useRef(incomingLayoutSignature);
	const [activeLinkId, setActiveLinkId] = useState<string | null>(null);

	useEffect(() => {
		if (incomingLayoutSignature === lastHydratedSignatureRef.current) {
			return;
		}
		lastHydratedSignatureRef.current = incomingLayoutSignature;
		setContainerLinks(buildContainerMap(links, orderedSections));
	}, [incomingLayoutSignature, links, orderedSections]);

	const activeLink = useMemo(() => {
		if (!activeLinkId) return null;
		for (const items of Object.values(containerLinks)) {
			const found = items.find((item) => item.id === activeLinkId);
			if (found) return found;
		}
		return null;
	}, [activeLinkId, containerLinks]);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragStart = (event: DragStartEvent) => {
		if (!enableDrag) return;
		setActiveLinkId(fromLinkDragId(event.active.id));
	};

	const handleDragEnd = (event: DragEndEvent) => {
		if (!enableDrag) return;
		setActiveLinkId(null);

		const activeLinkId = fromLinkDragId(event.active.id);
		if (!activeLinkId || !event.over) return;

		const overId = event.over.id;
		const activeContainerId = findContainerForLinkId(
			containerLinks,
			activeLinkId,
		);
		if (!activeContainerId) return;

		const overLinkId = fromLinkDragId(overId);
		const overContainerId = overLinkId
			? findContainerForLinkId(containerLinks, overLinkId)
			: typeof overId === "string" && overId.startsWith("container:")
				? overId
				: null;

		if (!overContainerId) return;
		if (activeContainerId === overContainerId && activeLinkId === overLinkId)
			return;

		const previousContainers = containerLinks;
		const nextContainers: Record<ContainerId, DashboardLink[]> = {
			...containerLinks,
			[activeContainerId]: [...containerLinks[activeContainerId]],
			[overContainerId]: [...containerLinks[overContainerId]],
		};

		if (activeContainerId === overContainerId) {
			const currentItems = nextContainers[activeContainerId];
			const activeIndex = currentItems.findIndex(
				(item) => item.id === activeLinkId,
			);
			if (activeIndex === -1) return;

			const overIndex = overLinkId
				? currentItems.findIndex((item) => item.id === overLinkId)
				: currentItems.length - 1;
			if (overIndex === -1 || activeIndex === overIndex) return;

			nextContainers[activeContainerId] = arrayMove(
				currentItems,
				activeIndex,
				overIndex,
			);
		} else {
			const sourceItems = nextContainers[activeContainerId];
			const targetItems = nextContainers[overContainerId];
			const activeIndex = sourceItems.findIndex(
				(item) => item.id === activeLinkId,
			);
			if (activeIndex === -1) return;

			const [movingItem] = sourceItems.splice(activeIndex, 1);
			if (!movingItem) return;

			const overIndex = overLinkId
				? targetItems.findIndex((item) => item.id === overLinkId)
				: targetItems.length;
			const insertIndex = overIndex === -1 ? targetItems.length : overIndex;
			targetItems.splice(insertIndex, 0, {
				...movingItem,
				sectionId: fromContainerId(overContainerId),
			});
		}

		setContainerLinks(nextContainers);

		const payload = toLayoutPayload(nextContainers, orderedSections);
		void onLayoutChange(payload).catch(() => {
			setContainerLinks(previousContainers);
		});
	};

	const content = (
		<div className="space-y-4">
			<SectionColumn
				title="Unsectioned"
				description={`${containerLinks[UNSECTIONED_CONTAINER_ID]?.length ?? 0} link${(containerLinks[UNSECTIONED_CONTAINER_ID]?.length ?? 0) === 1 ? "" : "s"}`}
				containerId={UNSECTIONED_CONTAINER_ID}
				links={containerLinks[UNSECTIONED_CONTAINER_ID] ?? []}
				onEditLink={onEditLink}
				onDeleteLink={onDeleteLink}
				onCreateSectionAt={(splitIndex) =>
					onCreateSectionAt({ sourceSectionId: null, splitIndex })
				}
				enableDrag={enableDrag}
			/>

			{orderedSections.map((section) => {
				const sectionContainerId = toContainerId(section.id);
				const sectionLinks = containerLinks[sectionContainerId] ?? [];
				return (
					<SectionColumn
						key={section.id}
						title={section.title}
						description={`${sectionLinks.length} link${sectionLinks.length === 1 ? "" : "s"}`}
						containerId={sectionContainerId}
						links={sectionLinks}
						onEditLink={onEditLink}
						onDeleteLink={onDeleteLink}
						onCreateSectionAt={(splitIndex) =>
							onCreateSectionAt({
								sourceSectionId: section.id,
								splitIndex,
							})
						}
						onRenameSection={() => onRenameSection(section)}
						onDeleteSection={() => onDeleteSection(section.id)}
						enableDrag={enableDrag}
					/>
				);
			})}
		</div>
	);

	if (!enableDrag) {
		return content;
	}

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCorners}
			onDragStart={handleDragStart}
			onDragCancel={() => setActiveLinkId(null)}
			onDragEnd={handleDragEnd}
		>
			{content}
			<DragOverlay>
				{activeLink ? (
					<div className="w-full max-w-[680px] rounded-xl border-2 border-black bg-[#FFFCEF] p-4 shadow-[6px_6px_0_0_#11110F]">
						<div className="flex items-center gap-3">
							<span aria-hidden="true" className="touch-none text-[#6A675C]">
								<GripVertical className="h-4 w-4" />
							</span>
							<div className="min-w-0 flex-1">
								<div className="flex items-start gap-3">
									<LinkIcon
										iconUrl={activeLink.iconUrl}
										iconBgColor={activeLink.iconBgColor}
									/>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<span className="truncate text-sm font-medium text-[#11110F]">
												{activeLink.title}
											</span>
											{!activeLink.isActive && (
												<Badge variant="secondary" className="shrink-0 text-xs">
													Hidden
												</Badge>
											)}
										</div>
										<span className="block truncate text-xs text-[#4B4B45]">
											{activeLink.url}
										</span>
										{activeLink.description && (
											<span className="mt-0.5 block truncate text-xs text-[#6A675C]">
												{activeLink.description}
											</span>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}
