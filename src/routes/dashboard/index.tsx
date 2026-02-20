import { createFileRoute } from "@tanstack/react-router"
import { useTRPC } from "#/integrations/trpc/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { DraggableLinkList } from "#/components/dashboard/DraggableLinkList"
import { LinkForm } from "#/components/dashboard/LinkForm"
import type { LinkFormData } from "#/components/dashboard/LinkForm"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog"
import { Button } from "#/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"

export const Route = createFileRoute("/dashboard/")({
	component: DashboardPage,
})

interface LinkType {
	id: string
	title: string
	url: string
	description: string | null
	iconUrl: string | null
	isActive: boolean | null
	sortOrder: number | null
}

function DashboardPage() {
	const trpc = useTRPC()
	const queryClient = useQueryClient()
	const [showAdd, setShowAdd] = useState(false)
	const [editingLink, setEditingLink] = useState<LinkType | null>(null)

	const { data: links = [], isLoading } = useQuery(
		trpc.links.list.queryOptions(),
	)

	const addLink = useMutation(trpc.links.add.mutationOptions())
	const updateLink = useMutation(trpc.links.update.mutationOptions())
	const deleteLink = useMutation(trpc.links.delete.mutationOptions())
	const reorderLinks = useMutation(trpc.links.reorder.mutationOptions())

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: ["trpc", "links", "list"] })

	const handleAdd = async (data: LinkFormData) => {
		await addLink.mutateAsync(data)
		await invalidate()
		setShowAdd(false)
	}

	const handleUpdate = async (data: LinkFormData) => {
		if (!editingLink) return
		await updateLink.mutateAsync({
			id: editingLink.id,
			...data,
			iconUrl: data.iconUrl ?? null,
		})
		await invalidate()
		setEditingLink(null)
	}

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this link?")) return
		await deleteLink.mutateAsync({ id })
		await invalidate()
	}

	const handleReorder = async (ids: string[]) => {
		await reorderLinks.mutateAsync({ ids })
		await invalidate()
	}

	return (
		<div className="max-w-2xl px-4 py-5 sm:px-6 md:p-8">
			<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1
						className="text-2xl text-[#11110F]"
						style={{ fontFamily: "'Archivo Black', sans-serif" }}
					>
						Links
					</h1>
					<p className="text-sm text-[#4B4B45] mt-1">
						Manage and reorder your links
					</p>
				</div>
				<Button onClick={() => setShowAdd(true)} className="w-full sm:w-auto">
					<Plus className="w-4 h-4 mr-1.5" />
					Add link
				</Button>
			</div>

			{isLoading ? (
				<div className="space-y-2">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="h-16 border-2 border-black bg-[#FFFCEF] rounded-xl animate-pulse"
						/>
					))}
				</div>
			) : links.length === 0 ? (
				<div className="text-center py-16 kinetic-panel">
					<p className="text-[#4B4B45] text-sm">No links yet</p>
					<Button
						onClick={() => setShowAdd(true)}
						variant="outline"
						className="mt-4"
					>
						Add your first link
					</Button>
				</div>
			) : (
				<DraggableLinkList
					links={links}
					onReorder={handleReorder}
					onEdit={(link) => setEditingLink(link)}
					onDelete={handleDelete}
				/>
			)}

			{/* Add Dialog */}
			<Dialog open={showAdd} onOpenChange={setShowAdd}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Add link</DialogTitle>
					</DialogHeader>
					<LinkForm
						onSubmit={handleAdd}
						onCancel={() => setShowAdd(false)}
						submitLabel="Add link"
					/>
				</DialogContent>
			</Dialog>

			{/* Edit Dialog */}
			<Dialog open={!!editingLink} onOpenChange={() => setEditingLink(null)}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Edit link</DialogTitle>
					</DialogHeader>
					{editingLink && (
						<LinkForm
							defaultValues={{
								title: editingLink.title,
								url: editingLink.url,
								description: editingLink.description ?? "",
								iconUrl: editingLink.iconUrl ?? "",
								isActive: editingLink.isActive ?? true,
							}}
							onSubmit={handleUpdate}
							onCancel={() => setEditingLink(null)}
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	)
}
