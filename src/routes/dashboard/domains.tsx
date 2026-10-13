import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "#/components/dashboard/PageHeader";
import { Button } from "#/components/ui/button";
import { useTRPC } from "#/integrations/trpc/react";
import { getDashboardDomain } from "#/lib/auth-server";
export const Route = createFileRoute("/dashboard/domains")({
	loader: async () => {
		const data = await getDashboardDomain();
		if (data.status === "unauthenticated") throw redirect({ to: "/sign-in" });
		if (data.status === "no-profile") throw redirect({ to: "/onboarding" });
		return data.domain;
	},
	component: DomainPage,
});
function DomainPage() {
	const { domain, hostingConfigured } = Route.useLoaderData(),
		trpc = useTRPC(),
		router = useRouter();
	const [hostname, setHostname] = useState(""),
		[ready, setReady] = useState(false);
	useEffect(() => setReady(true), []);
	const add = useMutation(trpc.domains.add.mutationOptions()),
		verify = useMutation(trpc.domains.verify.mutationOptions()),
		remove = useMutation(trpc.domains.remove.mutationOptions());
	const busy = add.isPending || verify.isPending || remove.isPending;
	const action = async (fn: () => Promise<unknown>) => {
		try {
			const result = await fn();
			await router.invalidate();
			if (result && typeof result === "object" && "message" in result)
				toast.info(String(result.message));
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : "Could not update your domain",
			);
		}
	};
	return (
		<div className="dashboard-page px-4 py-6 sm:px-6 md:px-10">
			<PageHeader
				eyebrow="Your page. Your address."
				title="Custom domain"
				description="Connect a domain you own, such as links.yourname.com. Your existing llink.space address keeps working."
			/>
			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
				<section className="surface space-y-5 bg-card p-5 sm:p-7">
					{!domain ? (
						<form
							className="space-y-4"
							onSubmit={(e) => {
								e.preventDefault();
								void action(() => add.mutateAsync({ hostname }));
							}}
						>
							<label className="block text-sm font-medium">
								Domain name
								<input
									required
									disabled={!ready || busy}
									value={hostname}
									onChange={(e) => setHostname(e.target.value)}
									className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-3"
									placeholder="links.yourname.com"
									autoComplete="off"
								/>
							</label>
							<Button
								disabled={!ready || busy || !hostname.trim()}
								type="submit"
							>
								Add domain
							</Button>
						</form>
					) : (
						<>
							<div className="flex flex-wrap items-center justify-between gap-3">
								<h2 className="break-all text-xl font-bold">
									{domain.hostname}
								</h2>
								<span className="rounded-full border border-border px-3 py-1 text-xs font-bold uppercase">
									{domain.status}
								</span>
							</div>
							<div className="rounded-xl border border-border bg-card p-4">
								<h3 className="font-bold">1. Verify ownership</h3>
								<p className="my-2 text-sm">
									Add this TXT record at your DNS provider. Keep it in place
									while the domain is connected.
								</p>
								<dl className="space-y-2 text-sm">
									<dt className="font-semibold">TXT name</dt>
									<dd className="break-all font-mono">{domain.proofHost}</dd>
									<dt className="font-semibold">TXT value</dt>
									<dd className="break-all font-mono">{domain.proofValue}</dd>
								</dl>
							</div>
							<div className="rounded-xl border border-border bg-card p-4">
								<h3 className="font-bold">2. Connect hosting</h3>
								{!hostingConfigured ? (
									<p className="mt-2 text-sm">
										Hosting is not configured on this installation yet. You can
										verify ownership now; the site operator must enable domain
										hosting before this address can serve your page.
									</p>
								) : !domain.hosting ? (
									<p className="mt-2 text-sm">
										After ownership is verified, we’ll provision hosting and
										show the exact DNS records to add.
									</p>
								) : (
									<>
										<p className="my-2 text-sm">
											Add these records exactly as shown. For a root domain, use
											your DNS provider’s CNAME flattening, ALIAS, or ANAME
											support.
										</p>
										<div className="space-y-3">
											{domain.hosting.dnsRecords.map((r) => (
												<div
													key={`${r.fqdn}-${r.recordType}-${r.requiredValue}`}
													className="rounded-lg border border-border p-3 text-xs"
												>
													<strong>
														{r.recordType} · {r.status}
													</strong>
													<p className="mt-1 break-all font-mono">
														{r.fqdn || r.hostlabel}
													</p>
													<p className="mt-1 break-all font-mono">
														{r.requiredValue}
													</p>
												</div>
											))}
											{domain.hosting.verificationToken && (
												<div className="rounded-lg border border-border p-3 text-xs">
													<strong>Hosting verification TXT</strong>
													<p className="mt-1 break-all font-mono">
														{domain.hosting.verificationDnsHost ||
															"Use the verification name in your Railway dashboard"}
													</p>
													<p className="mt-1 break-all font-mono">
														{domain.hosting.verificationToken}
													</p>
												</div>
											)}
										</div>
										<p className="mt-3 text-sm">
											Certificate: {domain.hosting.certificateStatus} · Hosting
											ownership:{" "}
											{domain.hosting.verified ? "verified" : "pending"}
										</p>
									</>
								)}
							</div>
							<div className="flex flex-wrap gap-3">
								<Button
									disabled={!ready || busy}
									onClick={() => action(() => verify.mutateAsync())}
								>
									{verify.isPending ? "Checking DNS…" : "Verify & check status"}
								</Button>
								{domain.status === "active" && (
									<a
										href={`https://${domain.hostname}/`}
										target="_blank"
										rel="noreferrer"
										className="rounded-lg border border-border px-4 py-2 text-sm font-bold"
									>
										Open custom domain ↗
									</a>
								)}
								<Button
									variant="outline"
									disabled={!ready || busy}
									onClick={() => {
										if (
											window.confirm(
												"Remove this domain from your page and disconnect any hosting created here?",
											)
										)
											void action(() => remove.mutateAsync());
									}}
								>
									Remove domain
								</Button>
							</div>
							<p className="text-xs text-muted-foreground">
								DNS changes can take time to propagate. A domain becomes active
								only after ownership, routing records, and its HTTPS certificate
								are verified.
							</p>
						</>
					)}
				</section>
				<aside className="surface-sunken p-5 sm:p-6">
					<p className="eyebrow">How it works</p>
					<ol className="mt-4 space-y-4">
						{[
							[
								"Add your domain",
								"Use a subdomain you control, like links.yourname.com.",
							],
							[
								"Update DNS",
								"Copy the records shown here into your domain provider.",
							],
							[
								"Go live",
								"Once ownership, routing and HTTPS verify, your page is served there.",
							],
						].map(([title, body], index) => (
							<li key={title} className="flex gap-3">
								<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[11px] text-primary-foreground">
									{index + 1}
								</span>
								<span>
									<span className="block text-sm font-semibold">{title}</span>
									<span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
										{body}
									</span>
								</span>
							</li>
						))}
					</ol>
				</aside>
			</div>
		</div>
	);
}
