import { pageReadiness } from "#/lib/page-readiness";
export function PageReadiness({
	profile,
	links,
}: {
	profile: Parameters<typeof pageReadiness>[0];
	links: Parameters<typeof pageReadiness>[1];
}) {
	const checks = pageReadiness(profile, links);
	const passed = checks.filter((c) => c.ok).length;
	return (
		<details className="kinetic-panel bg-[#FFFCEF] p-5">
			<summary className="cursor-pointer font-bold">
				Page readiness · {passed}/{checks.length}
			</summary>
			<p className="my-3 text-xs">
				A local checklist for your draft, not a complete accessibility audit.
				Check destination availability in Link health.
			</p>
			<ul className="space-y-3">
				{checks.map((c) => (
					<li key={c.id} className="rounded-lg border border-black/15 p-3">
						<p className="text-sm font-semibold">
							{c.ok ? "✓ Ready" : "○ Review"} · {c.title}
						</p>
						<p className="mt-1 text-xs">{c.detail}</p>
					</li>
				))}
			</ul>
		</details>
	);
}
