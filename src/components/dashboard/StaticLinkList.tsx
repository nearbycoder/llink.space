import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { LinkIcon } from "#/components/links/LinkIcon";
import { Button } from "#/components/ui/button";

interface Link {
	id: string;
	title: string;
	url: string;
	description: string | null;
	iconUrl: string | null;
	iconBgColor: string | null;
	isActive: boolean | null;
	sortOrder: number | null;
}

interface StaticLinkListProps {
	links: Link[];
	onEdit: (link: Link) => void;
	onDelete: (id: string) => void;
}

export function StaticLinkList({
	links,
	onEdit,
	onDelete,
}: StaticLinkListProps) {
	return (
		<div className="space-y-2">
			{links.map((link) => (
				<div
					key={link.id}
					className="group flex items-center gap-3 rounded-xl border-2 border-black bg-[#FFFCEF] p-4 shadow-[3px_3px_0_0_#11110F]"
				>
					<span
						aria-hidden="true"
						className="text-[#6A675C] cursor-default touch-none"
					>
						<GripVertical className="h-4 w-4" />
					</span>

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
			))}
		</div>
	);
}
