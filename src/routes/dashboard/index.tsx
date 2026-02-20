import { createFileRoute, redirect } from "@tanstack/react-router"
import { useTRPC } from "#/integrations/trpc/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { DraggableLinkList } from "#/components/dashboard/DraggableLinkList"
import { StaticLinkList } from "#/components/dashboard/StaticLinkList"
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
import { useEffect, useState } from "react"
import { getDashboardLinks } from "#/lib/auth-server"
import { isLinkIconKey } from "#/lib/link-icon-keys"

export const Route = createFileRoute("/dashboard/")({
	headers: () => ({
		"cache-control": "private, no-store, no-cache, must-revalidate, max-age=0",
	}),
	loader: async () => {
		const result = await getDashboardLinks()
		if (result.status === "unauthenticated") {
			throw redirect({ to: "/sign-in" })
		}
		if (result.status === "no-profile") {
			throw redirect({ to: "/onboarding" })
		}
		return { initialLinks: result.links }
	},
	component: DashboardPage,
})

interface LinkType {
	id: string
	title: string
	url: string
	description: string | null
	iconUrl: string | null
	iconBgColor: string | null
	isActive: boolean | null
	sortOrder: number | null
}

function DashboardPage() {
	const { initialLinks } = Route.useLoaderData()
	const trpc = useTRPC()
	const queryClient = useQueryClient()
	const [isHydrated, setIsHydrated] = useState(false)
	const [showAdd, setShowAdd] = useState(false)
	const [editingLink, setEditingLink] = useState<LinkType | null>(null)
	const linksQueryOptions = trpc.links.list.queryOptions()

	const {
		data: links = initialLinks,
		isLoading,
		refetch: refetchLinks,
	} = useQuery({
		...linksQueryOptions,
		initialData: initialLinks,
	})

	const addLink = useMutation(trpc.links.add.mutationOptions())
	const updateLink = useMutation(trpc.links.update.mutationOptions())
	const deleteLink = useMutation(trpc.links.delete.mutationOptions())
	const reorderLinks = useMutation(trpc.links.reorder.mutationOptions())

	useEffect(() => {
		setIsHydrated(true)
	}, [])

	const refreshLinks = async () => {
		await queryClient.invalidateQueries({
			queryKey: linksQueryOptions.queryKey,
			exact: true,
		})
		await refetchLinks()
	}

	const handleAdd = async (data: LinkFormData) => {
		const created = await addLink.mutateAsync(data)
		queryClient.setQueryData<LinkType[]>(linksQueryOptions.queryKey, (current) =>
			current ? [...current, created] : [created],
		)
		await refreshLinks()
		setShowAdd(false)
	}

	const handleUpdate = async (data: LinkFormData) => {
		if (!editingLink) return
		const updated = await updateLink.mutateAsync({
			id: editingLink.id,
			...data,
			iconUrl: data.iconUrl ?? null,
		})
		queryClient.setQueryData<LinkType[]>(linksQueryOptions.queryKey, (current) =>
			current
				? current.map((link) => (link.id === updated.id ? { ...link, ...updated } : link))
				: current,
		)
		await refreshLinks()
		setEditingLink(null)
	}

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this link?")) return
		await deleteLink.mutateAsync({ id })
		queryClient.setQueryData<LinkType[]>(linksQueryOptions.queryKey, (current) =>
			current ? current.filter((link) => link.id !== id) : current,
		)
		await refreshLinks()
	}

	const handleReorder = async (ids: string[]) => {
		await reorderLinks.mutateAsync({ ids })
		await refreshLinks()
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
				<>
					{isHydrated ? (
						<DraggableLinkList
							links={links}
							onReorder={handleReorder}
							onEdit={(link) => setEditingLink(link)}
							onDelete={handleDelete}
						/>
					) : (
						<StaticLinkList
							links={links}
							onEdit={(link) => setEditingLink(link)}
							onDelete={handleDelete}
						/>
					)}
				</>
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
								iconUrl:
									editingLink.iconUrl && isLinkIconKey(editingLink.iconUrl)
										? editingLink.iconUrl
										: "",
								iconBgColor: editingLink.iconBgColor ?? "#F5FF7B",
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
