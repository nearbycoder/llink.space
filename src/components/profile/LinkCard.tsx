import { ArrowUpRight, Bookmark } from "lucide-react";
import "./public-profile.css";
import { LinkIcon } from "#/components/links/LinkIcon";
import { isAllowedAvatarUrl, normalizeHttpUrl } from "#/lib/security";

interface LinkCardProps {
	saved?: boolean;
	saveReady?: boolean;
	onToggleSave?: (id: string) => void;
	buttonStyle?: string;
	featured?: boolean;
	featureImageUrl?: string | null;
	ctaLabel?: string | null;
	id: string;
	title: string;
	url: string;
	description?: string | null;
	iconUrl?: string | null;
	iconBgColor?: string | null;
	cardBg?: string;
	cardBorder?: string;
	textColor?: string;
	mutedTextColor?: string;
	onClickRecord?: (linkId: string) => void;
}

export function LinkCard({
	saved,
	saveReady,
	onToggleSave,
	id,
	buttonStyle,
	featured,
	featureImageUrl,
	ctaLabel,
	title,
	url,
	description,
	iconUrl,
	iconBgColor,
	cardBg = "#FFFFFF",
	cardBorder = "#16140F",
	textColor = "#16140F",
	mutedTextColor = "#5F5A51",
	onClickRecord,
}: LinkCardProps) {
	const handleClick = () => {
		if (!safeUrl) {
			return;
		}
		if (onClickRecord) {
			onClickRecord(id);
		}
	};
	const safeUrl = normalizeHttpUrl(url);

	return (
		<div className="public-link-card" data-featured={featured || undefined}>
			<a
				data-public-link
				href={safeUrl ?? "#"}
				target="_blank"
				rel="noopener noreferrer nofollow ugc"
				onClick={(event) => {
					if (!safeUrl) {
						event.preventDefault();
						return;
					}
					handleClick();
				}}
				className="group block w-full border px-3 py-3"
				style={{
					backgroundColor: cardBg,
					borderRadius:
						buttonStyle === "pill" ? 999 : buttonStyle === "square" ? 0 : 16,
					borderColor: `color-mix(in srgb, ${cardBorder} 16%, transparent)`,
				}}
			>
				{featured && (
					<div className="mb-4 space-y-3">
						{featureImageUrl && isAllowedAvatarUrl(featureImageUrl) && (
							<img
								src={featureImageUrl}
								alt=""
								className="aspect-video w-full rounded-xl object-cover"
								loading="lazy"
							/>
						)}
						<span
							className="inline-flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
							style={{ color: mutedTextColor }}
						>
							<span
								aria-hidden="true"
								className="size-1.5 rounded-full bg-[#FF5F1F]"
							/>
							In the spotlight
						</span>
					</div>
				)}
				<div
					className={`flex items-center justify-between ${onToggleSave ? "pr-10" : ""}`}
				>
					<div className="min-w-0 flex items-center gap-3.5">
						<LinkIcon
							iconUrl={iconUrl}
							iconBgColor={iconBgColor}
							className="size-10 rounded-xl"
							glyphClassName="size-[1.1rem]"
						/>
						<div className="min-w-0">
							<p
								className="truncate text-[15px] font-semibold tracking-[-0.01em]"
								style={{ color: textColor }}
							>
								{title}
							</p>
							{description && (
								<p
									className="mt-0.5 truncate text-[13px]"
									style={{ color: mutedTextColor }}
								>
									{description}
								</p>
							)}
						</div>
					</div>
					{!onToggleSave && (
						<ArrowUpRight
							aria-hidden="true"
							className="public-link-arrow ml-3 size-4 shrink-0"
							style={{ color: mutedTextColor }}
						/>
					)}
				</div>
				{featured && (
					<p
						className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold"
						style={{
							color: cardBg,
							backgroundColor: textColor,
						}}
					>
						{ctaLabel || "Explore more"}
						<ArrowUpRight aria-hidden="true" className="size-4" />
					</p>
				)}
			</a>
			{onToggleSave && (
				<button
					data-print-hidden
					type="button"
					disabled={!saveReady}
					aria-label={`Save ${title} for later`}
					title={
						saved ? "Remove from saved links" : "Save to your reading list"
					}
					aria-pressed={!!saved}
					onClick={() => onToggleSave(id)}
					className="public-link-save"
					style={{ color: textColor }}
				>
					<Bookmark
						size={17}
						fill={saved ? "currentColor" : "none"}
						aria-hidden="true"
					/>
				</button>
			)}
		</div>
	);
}
