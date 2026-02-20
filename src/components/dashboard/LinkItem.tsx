import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Pencil, Trash2 } from "lucide-react"
import { Button } from "#/components/ui/button"
import { Badge } from "#/components/ui/badge"
import { LinkIcon } from "#/components/links/LinkIcon"
import { cn } from "#/lib/utils"

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

interface LinkItemProps {
	link: Link
	onEdit: (link: Link) => void
	onDelete: (id: string) => void
}

export function LinkItem({ link, onEdit, onDelete }: LinkItemProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id: link.id })

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	}

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"flex items-center gap-3 border-2 border-black bg-[#FFFCEF] rounded-xl p-4 group shadow-[3px_3px_0_0_#11110F]",
				isDragging && "opacity-50",
			)}
		>
			<button
				type="button"
				className="text-[#6A675C] hover:text-[#11110F] cursor-grab active:cursor-grabbing touch-none"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="w-4 h-4" />
			</button>

			<div className="flex-1 min-w-0">
				<div className="flex items-start gap-3">
					<LinkIcon iconUrl={link.iconUrl} iconBgColor={link.iconBgColor} />
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<span className="font-medium text-sm text-[#11110F] truncate">
								{link.title}
							</span>
							{!link.isActive && (
								<Badge variant="secondary" className="text-xs shrink-0">
									Hidden
								</Badge>
							)}
						</div>
						<span className="text-xs text-[#4B4B45] truncate block">
							{link.url}
						</span>
						{link.description && (
							<span className="text-xs text-[#6A675C] truncate block mt-0.5">
								{link.description}
							</span>
						)}
					</div>
				</div>
			</div>

			<div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
				<Button
					variant="ghost"
					size="sm"
					className="h-8 w-8 p-0"
					onClick={() => onEdit(link)}
				>
					<Pencil className="w-3.5 h-3.5" />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className="h-8 w-8 p-0 text-[#B42318] hover:text-[#7E1612] hover:bg-[#FFD9CF]"
					onClick={() => onDelete(link.id)}
				>
					<Trash2 className="w-3.5 h-3.5" />
				</Button>
			</div>
		</div>
	)
}
