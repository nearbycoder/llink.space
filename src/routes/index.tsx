import { createFileRoute, Link } from "@tanstack/react-router"
import { Sparkles } from "lucide-react"

export const Route = createFileRoute("/")({ component: LandingPage })

function LandingPage() {
	return (
		<div
			className="min-h-screen text-[#11110F] overflow-hidden"
			style={{
				fontFamily: "'Work Sans', sans-serif",
				background:
					"linear-gradient(128deg, #F5FF7B 0%, #8AE1E7 34%, #F2B7E2 68%, #FF8A4C 100%)",
			}}
		>
			<div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
				<div className="absolute -top-10 -right-8 w-44 h-44 rounded-full bg-[#111]/20 blur-3xl" />
				<section className="rounded-[2rem] border-2 border-black bg-[#FFFCEF] p-6 sm:p-10 md:p-12 shadow-[8px_8px_0px_0px_#111]">
					<div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-9 items-center">
						<div>
							<div className="mb-5 inline-flex rounded-full border-2 border-black bg-[#F5FF7B] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
								llink.space
							</div>
							<h1
								className="text-[2.1rem] leading-[0.95] sm:text-6xl md:text-7xl"
								style={{ fontFamily: "'Archivo Black', sans-serif" }}
							>
								ONE LINK. MAX TRACTION.
							</h1>
							<p className="mt-5 max-w-xl text-base sm:text-lg">
								For bold creators who want visual punch and instant conversion.
								Turn followers into action with one command center.
							</p>
							<div className="mt-8 flex flex-wrap gap-3">
								<Link
									to="/sign-up"
									className="rounded-xl border-2 border-black bg-[#111] text-[#F5FF7B] px-5 sm:px-6 py-3 font-semibold hover:-translate-y-0.5 transition-transform"
								>
									Build mine
								</Link>
								<Link
									to="/sign-in"
									className="rounded-xl border-2 border-black px-5 sm:px-6 py-3 font-semibold hover:bg-black hover:text-white transition-colors"
								>
									Sign in
								</Link>
							</div>
						</div>

						<div className="space-y-3">
							<div className="rounded-2xl border-2 border-black bg-[#FFFFFF] p-4 rotate-1 shadow-[5px_5px_0px_0px_#111]">
								<div className="flex items-center justify-between">
									<p className="font-semibold">daily.designs</p>
									<Sparkles className="w-4 h-4" />
								</div>
								<div className="mt-4 space-y-2">
									{["Latest drop", "Tutorial vault", "Discord", "Store"].map(
										(item) => (
											<div
												key={item}
												className="h-10 rounded-lg border-2 border-black bg-[#F8F8F4] px-3 flex items-center justify-between text-sm"
											>
												<span>{item}</span>
												<span>+</span>
											</div>
										),
									)}
								</div>
							</div>
							<div className="-rotate-1 rounded-2xl border-2 border-black bg-[#111] text-[#DFFAFD] p-4 shadow-[5px_5px_0px_0px_#111]">
								<p className="text-xs uppercase tracking-[0.2em]">This week</p>
								<p className="text-3xl mt-1 font-semibold">+312 click surge</p>
							</div>
						</div>
					</div>
				</section>
			</div>
		</div>
	)
}
