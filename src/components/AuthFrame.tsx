import type { ReactNode } from "react";
import { SiteBrand } from "#/components/SiteBrand";

const previewLinks = [
	{ title: "The spring collection", tone: "#FFD9C7" },
	{ title: "Notes from the studio", tone: "#C7D2FF" },
	{ title: "Workshop tickets", tone: "#C9E4C5" },
];

/** Split layout for sign-in, sign-up and onboarding. */
export function AuthFrame({ children }: { children: ReactNode }) {
	return (
		<div className="auth-workspace grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
			<aside
				className="relative hidden overflow-hidden bg-ink p-10 text-[#faf8f3] lg:flex lg:flex-col"
				aria-hidden="true"
			>
				<SiteBrand
					size="md"
					className="text-[#faf8f3] [&_svg>rect:first-child]:fill-[#2b2820]"
				/>
				<div className="relative z-10 mt-auto max-w-md">
					<p className="font-display text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.035em]">
						Your corner of the internet,{" "}
						<em className="font-medium text-signal">beautifully kept.</em>
					</p>
					<p className="mt-5 max-w-sm text-[15px] leading-relaxed text-[#faf8f3]/65">
						One page for everything you make, with tools to organize it and
						insights that show what lands.
					</p>
				</div>
				<div className="pointer-events-none absolute -right-16 top-24 w-[22rem] rotate-[4deg] rounded-[2rem] bg-[#faf8f3] p-5 text-ink shadow-[0_40px_80px_-30px_rgb(0_0_0/0.7)]">
					<div className="flex flex-col items-center text-center">
						<span className="flex size-14 items-center justify-center rounded-full bg-signal font-display text-xl font-semibold">
							S
						</span>
						<p className="mt-3 font-display text-lg font-semibold">
							Studio Field
						</p>
						<p className="font-mono text-[11px] text-muted-foreground">
							@studiofield
						</p>
					</div>
					<div className="mt-4 space-y-2">
						{previewLinks.map((link) => (
							<div
								key={link.title}
								className="flex items-center gap-3 rounded-2xl border border-border px-3 py-2.5 text-sm font-semibold"
							>
								<span
									className="size-7 rounded-lg"
									style={{ background: link.tone }}
								/>
								{link.title}
							</div>
						))}
					</div>
				</div>
				<div className="absolute -bottom-40 -left-20 size-96 rounded-full bg-signal/20 blur-3xl" />
			</aside>
			<div className="flex min-h-screen flex-col px-5 py-6 sm:px-10">
				<a href="/" className="w-fit lg:hidden" aria-label="llink.space home">
					<SiteBrand size="md" />
				</a>
				<div className="mx-auto flex w-full max-w-[25rem] flex-1 flex-col justify-center py-12">
					{children}
				</div>
				<p className="text-center text-xs text-muted-foreground lg:text-left">
					<a href="/" className="underline-offset-4 hover:underline">
						← Back to llink.space
					</a>
				</p>
			</div>
		</div>
	);
}
