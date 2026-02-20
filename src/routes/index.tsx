import { createFileRoute, Link } from "@tanstack/react-router"
import {
	BarChart3,
	Link2,
	Palette,
	Rocket,
	ShieldCheck,
	Sparkles,
	UserCircle2,
} from "lucide-react"
import { SiteBrand } from "#/components/SiteBrand"

export const Route = createFileRoute("/")({ component: LandingPage })

const featureItems = [
	{
		title: "One page at /u/yourname",
		description:
			"Share a clean, memorable profile URL everywhere your audience already follows you.",
		icon: Link2,
	},
	{
		title: "Visual brand control",
		description:
			"Customize your profile, links, and icons so your page looks like your brand, not a template.",
		icon: Palette,
	},
	{
		title: "Built-in link analytics",
		description:
			"See total clicks, active links, and recent activity to understand what content converts.",
		icon: BarChart3,
	},
	{
		title: "Creator-first setup",
		description:
			"Go from sign-up to live page in minutes with guided onboarding and simple controls.",
		icon: Rocket,
	},
	{
		title: "Safe account system",
		description:
			"Authentication and session handling are built in so account access stays predictable.",
		icon: ShieldCheck,
	},
	{
		title: "Mobile-friendly by default",
		description:
			"Your page is designed to load fast and look great on phones where most bio traffic happens.",
		icon: UserCircle2,
	},
]

const setupSteps = [
	"Create your account and choose your username.",
	"Add links, icons, and profile details from the dashboard.",
	"Share your /u page and track what gets clicks.",
]

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
			<div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
				<div
					aria-hidden="true"
					className="pointer-events-none absolute -top-10 -right-8 h-44 w-44 rounded-full bg-[#111]/20 blur-3xl"
				/>
				<header className="mb-4 flex items-center justify-between">
					<SiteBrand
						size="md"
						className="rounded-full border-2 border-black bg-[#FFFCEF]/90 px-3 py-1 shadow-[2px_2px_0_0_#11110F]"
						textClassName="text-sm"
					/>
					<Link
						to="/sign-in"
						className="rounded-xl border-2 border-black bg-[#FFFCEF] px-4 py-2 text-sm font-semibold hover:bg-black hover:text-white transition-colors"
					>
						Sign in
					</Link>
				</header>

				<section className="rounded-[2rem] border-2 border-black bg-[#FFFCEF] p-6 sm:p-10 md:p-12 shadow-[8px_8px_0px_0px_#111]">
					<div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-9 items-center">
						<div>
							<h1
								className="text-[2rem] leading-[0.95] sm:text-6xl md:text-7xl"
								style={{ fontFamily: "'Archivo Black', sans-serif" }}
							>
								YOUR LINK-IN-BIO
								<br />
								HOME BASE.
							</h1>
							<p className="mt-5 max-w-xl text-base sm:text-lg">
								llink.space is a creator-focused profile page builder that turns
								your bio link into a single action hub. Publish a page at{" "}
								<code>/u/username</code>, add your most important links, and
								track clicks in one dashboard.
							</p>
							<ul className="mt-4 space-y-1 text-sm text-[#3D3A31]">
								<li>Mobile-first profile pages made for social traffic</li>
								<li>Fast link setup with icon choices and clean organization</li>
								<li>Simple analytics so you know what performs</li>
							</ul>
							<div className="mt-8 flex flex-wrap gap-3">
								<Link
									to="/sign-up"
									className="rounded-xl border-2 border-black bg-[#111] text-[#F5FF7B] px-5 sm:px-6 py-3 font-semibold hover:-translate-y-0.5 transition-transform"
								>
									Create your page
								</Link>
								<Link
									to="/sign-in"
									className="rounded-xl border-2 border-black px-5 sm:px-6 py-3 font-semibold hover:bg-black hover:text-white transition-colors"
								>
									Open dashboard
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
									{[
										"New release",
										"Resources",
										"Community",
										"Book a call",
									].map((item) => (
										<div
											key={item}
											className="h-10 rounded-lg border-2 border-black bg-[#F8F8F4] px-3 flex items-center justify-between text-sm"
										>
											<span>{item}</span>
											<span>+</span>
										</div>
									))}
								</div>
							</div>
							<div className="-rotate-1 rounded-2xl border-2 border-black bg-[#111] text-[#DFFAFD] p-4 shadow-[5px_5px_0px_0px_#111]">
								<p className="text-xs uppercase tracking-[0.2em]">
									Performance
								</p>
								<p className="text-3xl mt-1 font-semibold">+312 total clicks</p>
							</div>
						</div>
					</div>
				</section>

				<section className="mt-6 grid gap-4 sm:grid-cols-2">
					<div className="rounded-2xl border-2 border-black bg-[#FFFCEF]/95 p-5 shadow-[6px_6px_0px_0px_#111]">
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5B5648]">
							What is llink.space?
						</p>
						<p className="mt-2 text-sm sm:text-base leading-relaxed">
							It is your public profile layer for the web: one branded page that
							collects your links, products, content, and social channels. Instead
							of changing your bio constantly, you update llink.space once and keep
							your audience pointed to the right places.
						</p>
					</div>
					<div className="rounded-2xl border-2 border-black bg-[#111] p-5 text-[#FFFCEF] shadow-[6px_6px_0px_0px_#111]">
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#E0F9FB]">
							Who it&apos;s for
						</p>
						<p className="mt-2 text-sm sm:text-base leading-relaxed">
							Creators, freelancers, startups, communities, and personal brands
							that need a focused page for driving traffic from social platforms.
						</p>
					</div>
				</section>

				<section className="mt-6">
					<div className="rounded-2xl border-2 border-black bg-[#FFFCEF] p-5 sm:p-6 shadow-[6px_6px_0px_0px_#111]">
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5B5648]">
							Key features
						</p>
						<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{featureItems.map((feature) => (
								<div
									key={feature.title}
									className="rounded-xl border-2 border-black bg-white p-4"
								>
									<feature.icon className="h-4 w-4" />
									<p className="mt-2 text-sm font-semibold">{feature.title}</p>
									<p className="mt-1 text-xs text-[#4D4A40] leading-relaxed">
										{feature.description}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>

				<section className="mt-6">
					<div className="rounded-2xl border-2 border-black bg-[#F5FF7B] p-5 sm:p-6 shadow-[6px_6px_0px_0px_#111]">
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4F4A00]">
							How it works
						</p>
						<div className="mt-3 grid gap-2 sm:grid-cols-3">
							{setupSteps.map((step, index) => (
								<div
									key={step}
									className="rounded-xl border-2 border-black bg-[#FFFCEF] p-3 text-sm"
								>
									<span className="mb-1 inline-flex rounded-full border-2 border-black bg-white px-2 py-0.5 text-[10px] font-semibold">
										Step {index + 1}
									</span>
									<p className="mt-2 leading-relaxed">{step}</p>
								</div>
							))}
						</div>
					</div>
				</section>

				<section className="mt-6 rounded-2xl border-2 border-black bg-[#111] p-6 text-center text-[#FFFCEF] shadow-[6px_6px_0px_0px_#111]">
					<h2
						className="text-2xl sm:text-3xl"
						style={{ fontFamily: "'Archivo Black', sans-serif" }}
					>
						Start with one link. Grow everything behind it.
					</h2>
					<p className="mt-2 text-sm sm:text-base text-[#D7F9FC]">
						Create your llink.space page and make every profile visit count.
					</p>
					<div className="mt-4">
						<Link
							to="/sign-up"
							className="inline-flex rounded-xl border-2 border-[#F5FF7B] bg-[#F5FF7B] px-6 py-3 font-semibold text-[#111] hover:-translate-y-0.5 transition-transform"
						>
							Get started free
						</Link>
					</div>
				</section>
			</div>
		</div>
	)
}
