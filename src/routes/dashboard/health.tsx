import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "#/components/dashboard/PageHeader";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useTRPC } from "#/integrations/trpc/react";
import { getDashboardDesign } from "#/lib/auth-server";
import { downloadFile } from "#/lib/download-file";
import {
	buildHealthCsv,
	filterHealthLinks,
	HEALTH_STATES,
	staleHealthLinks,
} from "#/lib/health-tools";
export const Route = createFileRoute("/dashboard/health")({
	loader: async () => {
		const data = await getDashboardDesign();
		if (data.status === "unauthenticated") throw redirect({ to: "/sign-in" });
		if (data.status === "no-profile") throw redirect({ to: "/onboarding" });
		return data.layout.links;
	},
	component: HealthPage,
});
function HealthPage() {
	const [ready, setReady] = useState(false);
	useEffect(() => setReady(true), []);
	const links = Route.useLoaderData();
	const trpc = useTRPC(),
		router = useRouter();
	const [selected, setSelected] = useState<string[]>([]);
	const [query, setQuery] = useState("");
	const [state, setState] = useState("all");
	const filtered = filterHealthLinks(links, query, state);
	const stale = staleHealthLinks(filtered);
	const check = useMutation(trpc.health.check.mutationOptions());
	const run = async () => {
		try {
			await check.mutateAsync({ ids: selected });
			await router.invalidate();
			setSelected([]);
			toast.success("Link checks complete");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Link check failed");
		}
	};
	return (
		<div className="dashboard-page px-4 py-6 sm:px-6 md:px-10">
			<PageHeader
				eyebrow="Keep every destination working"
				title="Link health"
				description="Check up to 10 links at a time. Checks report redirects, broken destinations, and sites that restrict automated requests."
			/>
			<section className="surface bg-card p-4 sm:p-5">
				<div className="mb-4 grid gap-3 sm:grid-cols-2">
					<Input
						aria-label="Search link health"
						placeholder="Search titles or destinations"
						maxLength={500}
						disabled={!ready || check.isPending}
						value={query}
						onChange={(event) => {
							setQuery(event.target.value);
							setSelected([]);
						}}
					/>
					<select
						aria-label="Filter health status"
						disabled={!ready || check.isPending}
						value={state}
						onChange={(event) => {
							setState(event.target.value);
							setSelected([]);
						}}
						className="h-10 rounded-xl border border-input/60 bg-card px-3.5 text-base font-medium sm:text-sm"
					>
						<option value="all">All health results</option>
						{HEALTH_STATES.map((value) => (
							<option key={value} value={value}>
								{value.charAt(0).toUpperCase() +
									value.slice(1).replaceAll("-", " ")}
							</option>
						))}
					</select>
				</div>
				<p role="status" className="mb-3 text-xs text-muted-foreground">
					Showing {filtered.length} of {links.length} links. Changing filters
					clears the selection.
				</p>
				<div className="mb-4 flex flex-wrap items-center gap-3">
					<Button
						variant="brand"
						onClick={run}
						disabled={!ready || !selected.length || check.isPending}
					>
						{check.isPending
							? "Checking…"
							: `Check selected (${selected.length}/10)`}
					</Button>
					<Button
						variant="outline"
						disabled={
							!ready ||
							check.isPending ||
							!filtered.some((link) => !link.healthCheckedAt)
						}
						onClick={() =>
							setSelected(
								filtered
									.filter((l) => !l.healthCheckedAt)
									.slice(0, 10)
									.map((l) => l.id),
							)
						}
					>
						Select unchecked
					</Button>
					<Button
						variant="outline"
						title="Select up to 10 visible links checked more than 7 days ago, oldest first"
						disabled={!ready || check.isPending || !stale.length}
						onClick={() => setSelected(stale.map((link) => link.id))}
					>
						Select stale checks ({stale.length})
					</Button>
					<Button
						variant="outline"
						disabled={!ready || !filtered.length || check.isPending}
						onClick={() =>
							downloadFile(
								buildHealthCsv(filtered),
								"link-health.csv",
								"text/csv;charset=utf-8",
							)
						}
					>
						Export health results ({filtered.length})
					</Button>
				</div>
				<p className="mb-5 text-xs text-muted-foreground">
					Public HTTP(S) destinations only. A restricted or unreachable result
					does not necessarily mean a link is broken. One batch every 30
					seconds. Stale checks are more than 7 days old.
				</p>
				<div className="divide-y divide-border overflow-hidden rounded-[0.875rem] border border-border">
					{filtered.map((l) => (
						<label
							key={l.id}
							className="flex cursor-pointer items-start gap-3 bg-card px-4 py-3 transition-colors hover:bg-muted/50 has-[:checked]:bg-signal-soft/40"
						>
							<input
								type="checkbox"
								className="mt-1"
								checked={selected.includes(l.id)}
								disabled={
									!ready ||
									check.isPending ||
									(!selected.includes(l.id) && selected.length >= 10)
								}
								onChange={(e) =>
									setSelected((v) =>
										e.target.checked
											? [...v, l.id]
											: v.filter((id) => id !== l.id),
									)
								}
							/>
							<span className="min-w-0 flex-1">
								<span className="flex flex-wrap items-center gap-x-3 gap-y-1">
									<strong className="min-w-0 truncate text-sm font-semibold">
										{l.title}
									</strong>
									<span
										className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${healthTone(l.healthState)}`}
									>
										<span
											aria-hidden="true"
											className="size-1.5 rounded-full bg-current"
										/>
										{l.healthState ?? "Unchecked"} {l.healthStatusCode ?? ""}
									</span>
								</span>
								<span className="mt-0.5 block truncate font-mono text-[11.5px] text-muted-foreground">
									{l.url}
								</span>
								{l.healthCheckedAt && (
									<span className="mt-1 block text-[11px] text-muted-foreground">
										Checked {new Date(l.healthCheckedAt).toLocaleString()}
									</span>
								)}
								{l.healthFinalUrl && l.healthFinalUrl !== l.url && (
									<span className="mt-1 block break-all text-xs text-muted-foreground">
										Redirects to {l.healthFinalUrl}
									</span>
								)}
							</span>
						</label>
					))}
				</div>
				{links.length > 0 && !filtered.length && (
					<p className="py-8 text-center text-sm text-muted-foreground">
						No links match these health filters.
					</p>
				)}
				{!links.length && (
					<p className="py-8 text-center text-sm text-muted-foreground">
						Add links to start checking their destinations.
					</p>
				)}
			</section>
		</div>
	);
}

function healthTone(state: string | null) {
	switch (state) {
		case "healthy":
			return "bg-success/10 text-success";
		case "redirected":
		case "restricted":
			return "bg-warning/15 text-warning-foreground";
		case "broken":
		case "blocked":
		case "unreachable":
		case "redirect-loop":
			return "bg-destructive/8 text-destructive";
		default:
			return "bg-muted text-muted-foreground";
	}
}
