import { Link } from "@tanstack/react-router";
import {
	ArrowRight,
	ArrowUpRight,
	BarChart3,
	Layers,
	Palette,
	Play,
	Plus,
	QrCode,
} from "lucide-react";
import { useState } from "react";
import { BrandMark, SiteBrand } from "#/components/SiteBrand";
import { authClient } from "#/lib/auth-client";
import { featureGroups } from "./features";
import { ProductDemo } from "./ProductDemo";
import "./marketing.css";

const marqueeItems = [
	"Portfolios",
	"Newsletters",
	"Podcasts",
	"Shops",
	"Events",
	"Menus",
	"Mixtapes",
	"Zines",
	"Workshops",
	"Studios",
];

const weekBars = [38, 52, 44, 61, 57, 82, 70];

export function LandingPage() {
	const { data: session, isPending } = authClient.useSession();
	const [filter, setFilter] = useState("all");
	const count = featureGroups.reduce(
		(sum, group) => sum + group.features.length,
		0,
	);
	let featureNumber = 0;
	return (
		<div className="marketing-page">
			<header className="marketing-nav">
				<div className="marketing-wrap marketing-nav-inner">
					<a href="/" aria-label="llink.space home">
						<SiteBrand size="lg" />
					</a>
					<nav aria-label="Main navigation">
						<a href="#tour" className="marketing-nav-link">
							Tour
						</a>
						<a href="#features" className="marketing-nav-link">
							Toolkit
						</a>
						<a href="#faq" className="marketing-nav-link">
							FAQ
						</a>
						<Link
							to={session?.user ? "/dashboard" : "/sign-in"}
							className="marketing-sign-in"
						>
							{isPending
								? "Your account"
								: session?.user
									? "Dashboard"
									: "Sign in"}
						</Link>
						<Link
							to="/sign-up"
							className="marketing-button marketing-button-ink marketing-nav-cta"
						>
							Get started
						</Link>
					</nav>
				</div>
			</header>
			<main>
				<section
					className="marketing-hero marketing-wrap"
					aria-labelledby="hero-title"
				>
					<div className="marketing-hero-copy">
						<p className="marketing-eyebrow">
							<span className="marketing-dot" aria-hidden="true" />
							Link-in-bio, made with care
						</p>
						<h1 id="hero-title">
							Everything you make,{" "}
							<em>
								one link away<span aria-hidden="true">.</span>
							</em>
						</h1>
						<p className="marketing-hero-description">
							Give your work a home on the internet: a page that looks like you,
							links that stay organized, and insights that tell you what’s
							landing.
						</p>
						<div className="marketing-actions">
							<Link
								to="/sign-up"
								className="marketing-button marketing-button-signal"
							>
								Create your page
								<ArrowRight size={18} aria-hidden="true" />
							</Link>
							<a href="#tour" className="marketing-watch">
								<span className="marketing-watch-icon" aria-hidden="true">
									<Play size={12} fill="currentColor" />
								</span>
								Watch the tour
							</a>
						</div>
						<Link to="/sign-up" className="marketing-claim">
							<span className="marketing-claim-url">
								llink.space/u/<strong>yourname</strong>
							</span>
							<span className="marketing-claim-action">
								Claim it
								<ArrowUpRight size={15} aria-hidden="true" />
							</span>
						</Link>
					</div>
					<div className="marketing-hero-art">
						<div className="marketing-hero-glow" aria-hidden="true" />
						<figure className="marketing-phone">
							<div className="marketing-phone-screen">
								<img
									src="/demo/profile-preview.webp"
									alt="Fictional Studio Field profile showing its bio, saved links, and collection links in the real app"
									width="390"
									height="790"
									fetchPriority="high"
								/>
							</div>
							<figcaption>Real app · sample profile</figcaption>
						</figure>
						<div
							className="marketing-float marketing-float-stats"
							aria-hidden="true"
						>
							<div className="marketing-float-head">
								<span>Clicks this week</span>
								<b>+38%</b>
							</div>
							<strong>1,284</strong>
							<div className="marketing-bars">
								{weekBars.map((height, index) => (
									<i
										// biome-ignore lint/suspicious/noArrayIndexKey: static decorative bars
										key={index}
										style={{ height: `${height}%` }}
										data-peak={height === 82 || undefined}
									/>
								))}
							</div>
						</div>
						<div
							className="marketing-float marketing-float-theme"
							aria-hidden="true"
						>
							<span>Theme</span>
							<div>
								<i style={{ background: "#FF5F1F" }} />
								<i style={{ background: "#16140F" }} />
								<i style={{ background: "#C7D2FF" }} />
								<i style={{ background: "#F4EBC8" }} />
							</div>
						</div>
						<div
							className="marketing-float marketing-float-qr"
							aria-hidden="true"
						>
							<QrCode size={22} />
							<span>
								Share kit
								<small>PNG · SVG</small>
							</span>
						</div>
					</div>
				</section>

				<div className="marketing-marquee" aria-hidden="true">
					<div className="marketing-marquee-track">
						{[...marqueeItems, ...marqueeItems].map((item, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: duplicated decorative list
							<span key={`${item}-${index}`}>
								{item}
								<BrandMark className="marketing-marquee-mark" />
							</span>
						))}
					</div>
				</div>

				<section
					className="marketing-pillars marketing-wrap"
					aria-labelledby="pillars-title"
				>
					<div className="marketing-section-heading">
						<p className="marketing-eyebrow">What it does</p>
						<h2 id="pillars-title">
							Three jobs, <em>done properly.</em>
						</h2>
					</div>
					<div className="marketing-bento">
						<article className="marketing-tile marketing-tile-design">
							<Palette size={20} aria-hidden="true" />
							<h3>Make it yours</h3>
							<p>
								Themes, fonts, buttons and fifteen kinds of content blocks.
								Preview every change on phone and desktop before you publish.
							</p>
							<div className="marketing-mini-studio" aria-hidden="true">
								<div className="marketing-mini-swatches">
									<i data-active />
									<i />
									<i />
									<i />
								</div>
								<div className="marketing-mini-page">
									<span className="marketing-mini-avatar" />
									<span className="marketing-mini-line" />
									<span className="marketing-mini-line short" />
									<span className="marketing-mini-button" />
									<span className="marketing-mini-button" />
								</div>
							</div>
						</article>
						<article className="marketing-tile marketing-tile-manage">
							<Layers size={20} aria-hidden="true" />
							<h3>Keep it together</h3>
							<p>
								Sections, drag-and-drop ordering, schedules, imports and batch
								edits for when your page grows up.
							</p>
							<ul className="marketing-mini-list" aria-hidden="true">
								<li>
									<i style={{ background: "#FFD9C7" }} />
									Spring collection
									<b>Live</b>
								</li>
								<li>
									<i style={{ background: "#C7D2FF" }} />
									Studio notes
									<b data-tone="muted">Fri 9:00</b>
								</li>
								<li>
									<i style={{ background: "#C9E4C5" }} />
									Workshop tickets
									<b>Live</b>
								</li>
							</ul>
						</article>
						<article className="marketing-tile marketing-tile-insights">
							<BarChart3 size={20} aria-hidden="true" />
							<h3>Know what works</h3>
							<p>
								Clicks by link, source, device and hour, compared with the
								previous period. Export anything to CSV.
							</p>
							<div className="marketing-mini-chart" aria-hidden="true">
								<svg
									viewBox="0 0 240 80"
									preserveAspectRatio="none"
									aria-hidden="true"
								>
									<path
										d="M0 64 C 30 60, 40 40, 70 44 S 120 22, 150 30 S 200 6, 240 12"
										fill="none"
										stroke="currentColor"
										strokeWidth="2.5"
										strokeLinecap="round"
									/>
									<path
										d="M0 70 C 30 68, 50 58, 80 60 S 130 50, 160 52 S 210 40, 240 44"
										fill="none"
										stroke="currentColor"
										strokeOpacity="0.25"
										strokeWidth="2"
										strokeDasharray="4 5"
									/>
								</svg>
							</div>
						</article>
					</div>
				</section>

				<ProductDemo />

				<section
					id="features"
					className="marketing-features marketing-wrap"
					aria-labelledby="features-title"
				>
					<div className="marketing-section-heading marketing-section-heading-split">
						<div>
							<p className="marketing-eyebrow">
								The toolkit · {count} features, available now
							</p>
							<h2 id="features-title">
								Small details. <em>Big possibilities.</em>
							</h2>
						</div>
						<p>
							Everything is built into the app and ready when you are. No
							plugins, no extra accounts.
						</p>
					</div>
					<fieldset className="marketing-filters" aria-label="Filter features">
						<button
							type="button"
							aria-pressed={filter === "all"}
							onClick={() => setFilter("all")}
						>
							Everything <span>{count}</span>
						</button>
						{featureGroups.map((group) => (
							<button
								type="button"
								key={group.id}
								aria-pressed={filter === group.id}
								onClick={() => setFilter(group.id)}
							>
								{group.label} <span>{group.features.length}</span>
							</button>
						))}
					</fieldset>
					<p className="marketing-sr-only" aria-live="polite">
						Showing{" "}
						{filter === "all"
							? count
							: featureGroups.find((group) => group.id === filter)?.features
									.length}{" "}
						features
					</p>
					<div className="marketing-feature-groups">
						{featureGroups.map((group) => {
							const start = featureNumber;
							featureNumber += group.features.length;
							if (filter !== "all" && filter !== group.id) return null;
							return (
								<section
									key={group.id}
									className="marketing-feature-group"
									aria-labelledby={`feature-${group.id}`}
								>
									<div className="marketing-group-intro">
										<span
											className="marketing-group-swatch"
											style={{ background: group.color }}
											aria-hidden="true"
										/>
										<p className="marketing-eyebrow">{group.eyebrow}</p>
										<h3 id={`feature-${group.id}`}>{group.label}.</h3>
										<p>{group.intro}</p>
									</div>
									<ul>
										{group.features.map((feature, index) => (
											<li key={feature.name}>
												<span
													className="marketing-feature-number"
													aria-hidden="true"
												>
													{String(start + index + 1).padStart(2, "0")}
												</span>
												<div>
													<h4>{feature.name}</h4>
													<p>{feature.description}</p>
												</div>
											</li>
										))}
									</ul>
								</section>
							);
						})}
					</div>
				</section>

				<section
					className="marketing-start marketing-wrap"
					aria-labelledby="start-title"
				>
					<div className="marketing-section-heading">
						<p className="marketing-eyebrow">From a blank page to home base</p>
						<h2 id="start-title">
							Live in <em>three steps.</em>
						</h2>
					</div>
					<ol>
						<li>
							<span aria-hidden="true">1</span>
							<h3>Claim your corner.</h3>
							<p>
								Choose a username and add the links you want people to find.
							</p>
						</li>
						<li>
							<span aria-hidden="true">2</span>
							<h3>Give it your signature.</h3>
							<p>Choose a theme, add your story, and preview every change.</p>
						</li>
						<li>
							<span aria-hidden="true">3</span>
							<h3>Send it into the world.</h3>
							<p>
								Publish your page, share your URL or QR code, and see what gets
								clicks.
							</p>
						</li>
					</ol>
				</section>

				<section
					id="faq"
					className="marketing-faq marketing-wrap"
					aria-labelledby="faq-title"
				>
					<div>
						<p className="marketing-eyebrow">Good to know</p>
						<h2 id="faq-title">A few useful details.</h2>
					</div>
					<div className="marketing-faq-list">
						<details>
							<summary>
								What do I need to use these tools?
								<Plus size={18} aria-hidden="true" />
							</summary>
							<p>
								They work with your existing llink.space account and browser.
								You do not need to connect an additional service to use these
								tools.
							</p>
						</details>
						<details>
							<summary>
								Will my draft changes go live immediately?
								<Plus size={18} aria-hidden="true" />
							</summary>
							<p>
								Design studio changes stay in your draft until you choose
								Publish design. Undo and redo work within your editing session;
								style backups give you a file you can keep.
							</p>
						</details>
						<details>
							<summary>
								Do saved views and reading lists sync between devices?
								<Plus size={18} aria-hidden="true" />
							</summary>
							<p>
								No. Named dashboard filters and visitor reading lists are stored
								in the browser where you save them. Visitors do not need an
								account to use a reading list. If storage is unavailable, the
								app explains that saved links will last only while the page
								stays open.
							</p>
						</details>
						<details>
							<summary>
								Can I use my own domain?
								<Plus size={18} aria-hidden="true" />
							</summary>
							<p>
								Yes. Connect a domain you own, such as links.yourname.com, from
								the dashboard. Your llink.space address keeps working too.
							</p>
						</details>
					</div>
				</section>

				<section className="marketing-closing" aria-labelledby="closing-title">
					<div className="marketing-wrap">
						<h2 id="closing-title">
							Make a little <em>room for yourself.</em>
						</h2>
						<div className="marketing-closing-actions">
							<Link
								to="/sign-up"
								className="marketing-button marketing-button-signal"
							>
								Let’s make your page
								<ArrowRight size={18} aria-hidden="true" />
							</Link>
							<p>Your page can be live in minutes.</p>
						</div>
					</div>
				</section>
			</main>
			<footer className="marketing-footer">
				<div className="marketing-wrap marketing-footer-inner">
					<div>
						<SiteBrand size="md" />
						<p>A home for everything you’re putting into the world.</p>
					</div>
					<nav aria-label="Footer">
						<a href="#tour">Tour</a>
						<a href="#features">Toolkit</a>
						<Link to="/sign-up">Create your page</Link>
						<a href="#hero-title">Back to top ↑</a>
					</nav>
				</div>
			</footer>
		</div>
	);
}
