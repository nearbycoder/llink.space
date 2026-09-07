import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUpRight, Check, Play } from "lucide-react";
import { useState } from "react";
import { SiteBrand } from "#/components/SiteBrand";
import { authClient } from "#/lib/auth-client";
import { featureGroups } from "./features";
import { ProductDemo } from "./ProductDemo";
import "./marketing.css";

export function LandingPage() {
	const { data: session, isPending } = authClient.useSession();
	const [filter, setFilter] = useState("all");
	const count = featureGroups.reduce(
		(sum, group) => sum + group.features.length,
		0,
	);
	return (
		<div className="marketing-page">
			<header className="marketing-nav marketing-wrap">
				<a href="/" aria-label="llink.space home">
					<SiteBrand size="lg" />
				</a>
				<nav aria-label="Main navigation">
					<a href="#demo">The demo</a>
					<a href="#features">What’s inside</a>
					<Link
						to={session?.user ? "/dashboard" : "/sign-in"}
						className="marketing-sign-in"
					>
						{isPending
							? "Your account"
							: session?.user
								? "Dashboard"
								: "Sign in"}
						<ArrowUpRight size={16} aria-hidden="true" />
					</Link>
				</nav>
			</header>
			<main>
				<section
					className="marketing-hero marketing-wrap"
					aria-labelledby="hero-title"
				>
					<div className="marketing-hero-copy">
						<p className="marketing-eyebrow">
							<span className="marketing-dot" />
							Your corner of the internet
						</p>
						<h1 id="hero-title">
							ONE LINK.
							<br />A WHOLE LOT
							<br />
							OF <span>YOU.</span>
						</h1>
						<p className="marketing-hero-description">
							Your work. Your words. Your next big thing.
							<br />
							Bring it all together on a page that feels like you—and give every
							visitor a way to explore.
						</p>
						<div className="marketing-actions">
							<Link
								to="/sign-up"
								className="marketing-button marketing-button-dark"
							>
								Create your page
								<ArrowUpRight size={20} aria-hidden="true" />
							</Link>
							<a href="#demo" className="marketing-watch">
								<Play size={16} fill="currentColor" aria-hidden="true" />
								See it in action
							</a>
						</div>
						<p className="marketing-hero-note">
							Your own profile URL. Live preview. Built-in click analytics.
						</p>
					</div>
					<div className="marketing-hero-art">
						<div className="marketing-orbit" aria-hidden="true" />
						<div className="marketing-new-sticker">
							<span>JUST LANDED</span>
							<strong>{count}</strong>
							<span>NEW FEATURES</span>
						</div>
						<figure className="marketing-phone">
							<div className="marketing-phone-bar">
								<span />
								llink.space / studiofield
								<span />
							</div>
							<img
								src="/demo/profile-preview.webp"
								alt="Fictional Studio Field profile showing its bio, reading list, and collection links in the real app"
								width="390"
								height="790"
								fetchPriority="high"
							/>
							<figcaption>REAL APP. SAMPLE PROFILE.</figcaption>
						</figure>
						<span className="marketing-art-note">
							A little space.
							<br />
							<em>All your possibilities.</em>
						</span>
					</div>
				</section>
				<div className="marketing-ribbon">
					<div className="marketing-wrap">
						<span>MAKE IT YOURS</span>
						<span aria-hidden="true">✳</span>
						<span>KEEP IT TOGETHER</span>
						<span aria-hidden="true">✳</span>
						<span>TAKE IT EVERYWHERE</span>
					</div>
				</div>
				<ProductDemo />
				<section
					id="features"
					className="marketing-features marketing-wrap"
					aria-labelledby="features-title"
				>
					<div className="marketing-section-heading">
						<div>
							<p className="marketing-eyebrow">
								The new collection / {count} features, available now
							</p>
							<h2 id="features-title">
								Small details.
								<br />
								Big possibilities.
							</h2>
						</div>
						<p>
							Every new feature, right here.
							<br />
							Built into the app, ready when you are.
						</p>
					</div>
					<fieldset
						className="marketing-filters"
						aria-label="Filter new features"
					>
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
						new features
					</p>
					<div className="marketing-feature-groups">
						{featureGroups
							.filter((group) => filter === "all" || filter === group.id)
							.map((group) => (
								<section
									key={group.id}
									className="marketing-feature-group"
									aria-labelledby={`feature-${group.id}`}
								>
									<div
										className="marketing-group-intro"
										style={{ background: group.color }}
									>
										<p className="marketing-eyebrow">{group.eyebrow}</p>
										<h3 id={`feature-${group.id}`}>{group.label}.</h3>
										<p>{group.intro}</p>
										<ArrowDown size={28} aria-hidden="true" />
									</div>
									<ul>
										{group.features.map((feature) => (
											<li key={feature.name}>
												<Check size={17} aria-hidden="true" />
												<div>
													<h4>{feature.name}</h4>
													<p>{feature.description}</p>
												</div>
											</li>
										))}
									</ul>
								</section>
							))}
					</div>
				</section>
				<section
					className="marketing-start marketing-wrap"
					aria-labelledby="start-title"
				>
					<p className="marketing-eyebrow">
						From a blank page to your home base
					</p>
					<div className="marketing-start-header">
						<h2 id="start-title">
							Make a little
							<br />
							<em>room for yourself.</em>
						</h2>
						<Link
							to="/sign-up"
							className="marketing-button marketing-button-dark"
						>
							Let’s make your page
							<ArrowUpRight size={20} aria-hidden="true" />
						</Link>
					</div>
					<ol>
						<li>
							<span>01</span>
							<h3>Claim your corner.</h3>
							<p>
								Choose a username and add the links you want people to find.
							</p>
						</li>
						<li>
							<span>02</span>
							<h3>Give it your signature.</h3>
							<p>Choose a theme, add your story, and preview every change.</p>
						</li>
						<li>
							<span>03</span>
							<h3>Send it out into the world.</h3>
							<p>
								Publish your page, share your URL or QR code, and see what gets
								clicks.
							</p>
						</li>
					</ol>
				</section>
				<section
					className="marketing-faq marketing-wrap"
					aria-label="A few useful details"
				>
					<h2>A few useful details.</h2>
					<details>
						<summary>What do I need to use the new features?</summary>
						<p>
							They work with your existing llink.space account and browser. You
							do not need to connect an additional service to use these 20
							tools.
						</p>
					</details>
					<details>
						<summary>Will my draft changes go live immediately?</summary>
						<p>
							Design studio changes stay in your draft until you choose Publish
							design. Undo and redo work within your editing session; style
							backups give you a file you can keep.
						</p>
					</details>
					<details>
						<summary>
							Do saved views and reading lists sync between devices?
						</summary>
						<p>
							No. Named dashboard filters and visitor reading lists are stored
							in the browser where you save them. Visitors do not need an
							account to use a reading list. If storage is unavailable, the app
							explains that saved links will last only while the page stays
							open.
						</p>
					</details>
				</section>
			</main>
			<footer className="marketing-footer marketing-wrap">
				<SiteBrand size="md" />
				<p>A home for everything you’re putting into the world.</p>
				<a href="#hero-title">Back to top ↑</a>
			</footer>
		</div>
	);
}
