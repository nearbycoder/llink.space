import { ArrowUpRight, Play } from "lucide-react";
import { useRef, useState } from "react";
import demo from "./demo-chapters.json";

export function ProductDemo() {
	const video = useRef<HTMLVideoElement>(null);
	const pendingTime = useRef<number | null>(null);
	const [started, setStarted] = useState(false);
	const [active, setActive] = useState(0);
	const [error, setError] = useState(false);
	const play = (time: number) => {
		const player = video.current;
		if (!player) return;
		setStarted(true);
		setError(false);
		if (player.readyState >= 1) player.currentTime = time;
		else pendingTime.current = time;
		void player.play().catch(() => setError(true));
	};
	return (
		<section id="tour" className="marketing-demo" aria-labelledby="demo-title">
			<div className="marketing-wrap">
				<div className="marketing-section-heading marketing-section-heading-split">
					<div>
						<p className="marketing-eyebrow">The tour · {demo.durationLabel}</p>
						<h2 id="demo-title">
							See it <em>come together.</em>
						</h2>
					</div>
					<p>
						A real walkthrough of the app with a sample profile. Captioned, no
						sound needed.
					</p>
				</div>
				<div className="marketing-cinema">
					<div className="marketing-cinema-bar">
						<span aria-hidden="true">
							<i />
							<i />
							<i />
						</span>
						<p>llink.space/dashboard</p>
						<span>{demo.durationLabel}</span>
					</div>
					<div className="marketing-video-stage">
						<video
							ref={video}
							controls={started}
							playsInline
							muted
							preload="none"
							poster={`/demo/product-tour-poster.webp?v=${demo.version}`}
							aria-label="llink.space product walkthrough"
							onLoadedMetadata={() => {
								if (pendingTime.current !== null && video.current) {
									video.current.currentTime = pendingTime.current;
									pendingTime.current = null;
								}
							}}
							onTimeUpdate={() => {
								const time = video.current?.currentTime ?? 0;
								const index = demo.chapters.reduce(
									(found, chapter, index) =>
										chapter.time <= time ? index : found,
									0,
								);
								setActive(Math.max(0, index));
							}}
							onError={() => setError(true)}
						>
							<source
								src={`/api/demo-video?v=${demo.version}`}
								type="video/mp4"
							/>
							<track
								kind="captions"
								src={`/demo/product-tour.vtt?v=${demo.version}`}
								srcLang="en"
								label="English walkthrough"
								default
							/>
							Your browser cannot play this video. The written walkthrough is
							below.
						</video>
						{!started && (
							<button
								type="button"
								className="marketing-play"
								onClick={() => play(0)}
							>
								<span>
									<Play fill="currentColor" aria-hidden="true" />
								</span>
								Watch the product tour
								<small>{demo.durationLabel} · captioned</small>
							</button>
						)}
					</div>
					<fieldset className="marketing-chapters" aria-label="Video chapters">
						{demo.chapters.map((chapter, index) => (
							<button
								type="button"
								key={chapter.title}
								onClick={() => play(chapter.time)}
								aria-pressed={started && active === index}
							>
								<span>
									0{index + 1} · {chapter.label}
								</span>
								<strong>{chapter.title}</strong>
								<ArrowUpRight size={16} aria-hidden="true" />
							</button>
						))}
					</fieldset>
				</div>
				{error && (
					<p role="status" className="marketing-video-error">
						Use the video’s play button to continue, or{" "}
						<a href={`/api/demo-video?v=${demo.version}`}>
							open the recording directly
						</a>
						. You can also read the walkthrough below.
					</p>
				)}
				<details className="marketing-transcript">
					<summary>Read the walkthrough</summary>
					<ol>
						{demo.chapters.map((chapter) => (
							<li key={chapter.title}>
								<strong>{chapter.title}.</strong> {chapter.description}
							</li>
						))}
					</ol>
				</details>
			</div>
		</section>
	);
}
