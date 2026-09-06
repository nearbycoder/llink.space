import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { useTRPC } from "#/integrations/trpc/react";
import { getDashboardDesign } from "#/lib/auth-server";
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
	const links = Route.useLoaderData();
	const trpc = useTRPC(),
		router = useRouter();
	const [selected, setSelected] = useState<string[]>([]);
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
		<div className="mx-auto max-w-5xl p-4 sm:p-8">
			<header className="mb-7">
				<p className="text-xs font-bold uppercase tracking-widest">
					Keep every destination working
				</p>
				<h1 className="mt-2 text-3xl font-black">Link health</h1>
				<p className="mt-2 text-sm">
					Check up to 10 links at a time. Checks report redirects, broken
					destinations, and sites that restrict automated requests.
				</p>
			</header>
			<section className="kinetic-panel bg-[#FFFCEF] p-5">
				<div className="mb-4 flex flex-wrap items-center gap-3">
					<Button onClick={run} disabled={!selected.length || check.isPending}>
						{check.isPending
							? "Checking…"
							: `Check selected (${selected.length}/10)`}
					</Button>
					<Button
						variant="outline"
						onClick={() =>
							setSelected(
								links
									.filter((l) => !l.healthCheckedAt)
									.slice(0, 10)
									.map((l) => l.id),
							)
						}
					>
						Select unchecked
					</Button>
				</div>
				<p className="mb-5 text-xs">
					Public HTTP(S) destinations only. A restricted or unreachable result
					does not necessarily mean a link is broken. One batch every 30
					seconds.
				</p>
				<div className="space-y-3">
					{links.map((l) => (
						<label
							key={l.id}
							className="flex items-start gap-3 rounded-xl border border-black/20 bg-white p-4"
						>
							<input
								type="checkbox"
								className="mt-1"
								checked={selected.includes(l.id)}
								disabled={
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
								<strong className="block truncate">{l.title}</strong>
								<span className="block truncate text-xs">{l.url}</span>
								<span className="mt-2 block text-xs font-semibold">
									{l.healthState ?? "Unchecked"} {l.healthStatusCode ?? ""}
									{l.healthCheckedAt
										? ` · ${new Date(l.healthCheckedAt).toLocaleString()}`
										: ""}
								</span>
								{l.healthFinalUrl && l.healthFinalUrl !== l.url && (
									<span className="block break-all text-xs">
										Redirects to {l.healthFinalUrl}
									</span>
								)}
							</span>
						</label>
					))}
				</div>
				{!links.length && (
					<p>Add links to start checking their destinations.</p>
				)}
			</section>
		</div>
	);
}
