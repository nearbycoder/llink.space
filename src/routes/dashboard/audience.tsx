import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UnsavedChangesGuard } from "#/components/dashboard/UnsavedChangesGuard";
import { Button } from "#/components/ui/button";
import { useTRPC } from "#/integrations/trpc/react";
import { getDashboardAudience } from "#/lib/auth-server";
export const Route = createFileRoute("/dashboard/audience")({
	loader: async () => {
		const data = await getDashboardAudience();
		if (data.status === "unauthenticated") throw redirect({ to: "/sign-in" });
		if (data.status === "no-profile") throw redirect({ to: "/onboarding" });
		return data.audience;
	},
	component: AudiencePage,
});
const field =
	"mt-1 w-full rounded-lg border border-black/30 bg-white px-3 py-2 text-sm";
function AudiencePage() {
	const initial = Route.useLoaderData(),
		trpc = useTRPC(),
		queryClient = useQueryClient();
	const [page, setPage] = useState(0),
		[ready, setReady] = useState(false);
	useEffect(() => setReady(true), []);
	const { data = initial, isFetching } = useQuery({
		...trpc.audience.list.queryOptions({ page }),
		initialData: page === 0 ? initial : undefined,
		enabled: ready,
	});
	const [enabled, setEnabled] = useState(initial.signupEnabled),
		[title, setTitle] = useState(initial.signupTitle),
		[saved, setSaved] = useState({
			enabled: initial.signupEnabled,
			title: initial.signupTitle,
		});
	const [apiKey, setApiKey] = useState(""),
		[listId, setListId] = useState("");
	const settings = useMutation(trpc.audience.settings.mutationOptions()),
		connect = useMutation(trpc.audience.connect.mutationOptions()),
		disconnect = useMutation(trpc.audience.disconnect.mutationOptions()),
		sync = useMutation(trpc.audience.sync.mutationOptions()),
		remove = useMutation(trpc.audience.remove.mutationOptions());
	const dirty =
		enabled !== saved.enabled || title !== saved.title || Boolean(apiKey);
	const refresh = () =>
		Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.audience.list.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.profile.getCurrent.queryKey(),
			}),
		]);
	const action = async (fn: () => Promise<unknown>, message: string) => {
		try {
			await fn();
			await refresh();
			toast.success(message);
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : "Could not complete the action",
			);
		}
	};
	const download = async () => {
		try {
			const csv = await queryClient.fetchQuery(
				trpc.audience.exportCsv.queryOptions(),
			);
			const url = URL.createObjectURL(
				new Blob([csv], { type: "text/csv;charset=utf-8;" }),
			);
			const a = document.createElement("a");
			a.href = url;
			a.download = "subscribers.csv";
			a.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		} catch {
			toast.error("Could not export subscribers");
		}
	};
	return (
		<div className="mx-auto max-w-5xl p-4 sm:p-8">
			<UnsavedChangesGuard
				when={dirty || settings.isPending || connect.isPending}
			/>
			<header className="mb-7">
				<p className="text-xs font-bold uppercase tracking-widest">
					Keep the conversation going
				</p>
				<h1 className="mt-2 text-3xl font-black">Audience</h1>
				<p className="mt-2 text-sm">
					Collect signups with consent, export your audience, and sync to your
					email list.
				</p>
			</header>
			<div className="grid gap-5 md:grid-cols-2">
				<section className="kinetic-panel bg-[#FFFCEF] p-5">
					<h2 className="text-lg font-bold">Signup block</h2>
					<fieldset
						disabled={!ready || settings.isPending}
						className="mt-4 space-y-4"
					>
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={enabled}
								onChange={(e) => setEnabled(e.target.checked)}
							/>
							Show email signup on my page
						</label>
						<label className="block text-sm">
							Signup heading
							<input
								className={field}
								value={title}
								maxLength={80}
								onChange={(e) => setTitle(e.target.value)}
							/>
						</label>
						<Button
							onClick={() =>
								action(async () => {
									await settings.mutateAsync({ enabled, title });
									setSaved({ enabled, title });
								}, "Signup settings saved")
							}
							disabled={!title.trim()}
						>
							Save signup settings
						</Button>
					</fieldset>
					<p className="mt-4 text-xs">
						A consent checkbox is required. Email ownership is not verified. Up
						to 10,000 records per page.
					</p>
				</section>
				<section className="kinetic-panel bg-[#FFFCEF] p-5">
					<h2 className="text-lg font-bold">Connect Brevo</h2>
					<p className="mt-2 text-xs">
						{data.connected
							? `Connected to list ${data.listId}`
							: "Use your Brevo API key and list ID. Keys are stored encrypted."}
					</p>
					{!data.connected ? (
						<form
							className="mt-4 space-y-3"
							onSubmit={(e) => {
								e.preventDefault();
								void action(async () => {
									await connect.mutateAsync({ apiKey, listId: Number(listId) });
									setApiKey("");
								}, "Brevo connection verified");
							}}
						>
							<fieldset
								disabled={!ready || connect.isPending}
								className="space-y-3"
							>
								<label className="block text-sm">
									Brevo API key
									<input
										type="password"
										autoComplete="off"
										className={field}
										value={apiKey}
										onChange={(e) => setApiKey(e.target.value)}
										required
									/>
								</label>
								<label className="block text-sm">
									Brevo list ID
									<input
										type="number"
										min="1"
										required
										className={field}
										value={listId}
										onChange={(e) => setListId(e.target.value)}
									/>
								</label>
								<Button type="submit">
									{connect.isPending ? "Verifying…" : "Verify connection"}
								</Button>
							</fieldset>
						</form>
					) : (
						<div className="mt-4 space-y-3">
							<Button
								disabled={sync.isPending}
								onClick={() =>
									action(async () => {
										const result = await sync.mutateAsync();
										if (result.failed)
											throw new Error(
												`${result.synced} records synced; a provider request failed. Retry to resume.`,
											);
									}, "Subscriber sync complete")
								}
							>
								{sync.isPending ? "Syncing…" : "Sync next 20"}
							</Button>
							<Button
								variant="outline"
								className="ml-2"
								disabled={sync.isPending || disconnect.isPending}
								onClick={() =>
									action(() => disconnect.mutateAsync(), "Brevo disconnected")
								}
							>
								Disconnect
							</Button>
						</div>
					)}
					<p className="mt-4 text-xs">
						Sync sends contacts and pending removals to Brevo. Manage campaigns,
						unsubscribe links, and existing provider contacts in Brevo.
						Disconnecting leaves those contacts in your provider account.
					</p>
				</section>
			</div>
			<section className="kinetic-panel mt-6 overflow-hidden bg-[#FFFCEF] p-5">
				<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
					<h2 className="text-lg font-bold">
						Subscribers · {data.active} active / {data.total} total
					</h2>
					<Button variant="outline" disabled={!ready} onClick={download}>
						Export subscribers CSV
					</Button>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead>
							<tr>
								<th className="py-2">Email / name</th>
								<th>Status</th>
								<th>Sync</th>
								<th>
									<span className="sr-only">Actions</span>
								</th>
							</tr>
						</thead>
						<tbody>
							{data.rows.map((r) => (
								<tr key={r.id} className="border-t border-black/15">
									<td className="py-3 pr-3">
										<span className="block">{r.email}</span>
										<span className="block text-xs">{r.name}</span>
									</td>
									<td className="pr-3">
										{r.unsubscribedAt ? "Unsubscribed" : "Active"}
									</td>
									<td className="pr-3">
										{r.unsubscribedAt
											? r.providerRemovedAt
												? "Removed"
												: "Removal pending"
											: r.syncedAt
												? "Synced"
												: "Pending"}
									</td>
									<td>
										<button
											type="button"
											disabled={!ready || remove.isPending || sync.isPending}
											className="text-xs underline"
											aria-label={`Remove subscriber ${r.email}`}
											onClick={() => {
												if (window.confirm(`Remove ${r.email} from this list?`))
													void action(
														() => remove.mutateAsync({ id: r.id }),
														"Subscriber removed",
													);
											}}
										>
											Remove
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				{!data.rows.length && (
					<p className="py-6 text-sm">
						Your subscribers will appear here after they sign up.
					</p>
				)}
				<div className="mt-4 flex items-center gap-3">
					<Button
						variant="outline"
						disabled={page === 0 || isFetching}
						onClick={() => setPage((p) => p - 1)}
					>
						Previous
					</Button>
					<span className="text-xs">Page {page + 1}</span>
					<Button
						variant="outline"
						disabled={(page + 1) * 50 >= data.total || isFetching}
						onClick={() => setPage((p) => p + 1)}
					>
						Next
					</Button>
				</div>
			</section>
		</div>
	);
}
