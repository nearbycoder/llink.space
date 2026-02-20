import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent } from "@dnd-kit/core"
import {
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { LinkItem } from "./LinkItem"

interface Link {
	id: string
	title: string
	url: string
	description: string | null
	iconUrl: string | null
	iconBgColor: string | null
	isActive: boolean | null
	sortOrder: number | null
}

interface DraggableLinkListProps {
	links: Link[]
	onReorder: (ids: string[]) => void
	onEdit: (link: Link) => void
	onDelete: (id: string) => void
}

export function DraggableLinkList({
	links,
	onReorder,
	onEdit,
	onDelete,
}: DraggableLinkListProps) {
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	)

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event
		if (!over || active.id === over.id) return

		const oldIndex = links.findIndex((l) => l.id === active.id)
		const newIndex = links.findIndex((l) => l.id === over.id)

		const newOrder = [...links]
		const [moved] = newOrder.splice(oldIndex, 1)
		newOrder.splice(newIndex, 0, moved)
		onReorder(newOrder.map((l) => l.id))
	}

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragEnd={handleDragEnd}
		>
			<SortableContext
				items={links.map((l) => l.id)}
				strategy={verticalListSortingStrategy}
			>
				<div className="space-y-2">
					{links.map((link) => (
						<LinkItem
							key={link.id}
							link={link}
							onEdit={onEdit}
							onDelete={onDelete}
						/>
					))}
				</div>
			</SortableContext>
		</DndContext>
	)
}
