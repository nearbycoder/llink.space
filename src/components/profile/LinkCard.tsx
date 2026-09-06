import { ExternalLink } from "lucide-react";
import { LinkIcon } from "#/components/links/LinkIcon";
import { isAllowedAvatarUrl, normalizeHttpUrl } from "#/lib/security";

interface LinkCardProps {
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
	cardBorder = "#11110F",
	textColor = "#11110F",
	mutedTextColor = "#4B4B45",
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
		<a
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
			className="group block w-full rounded-xl border-2 px-5 py-4 transition-transform shadow-[3px_3px_0_0_#11110F] hover:-translate-y-0.5 active:translate-y-0"
			style={{
				backgroundColor: cardBg,
				borderRadius:
					buttonStyle === "pill" ? 32 : buttonStyle === "square" ? 0 : 12,
				borderColor: cardBorder,
			}}
		>
			{featured && (
				<div className="mb-4 space-y-3">
					{featureImageUrl && isAllowedAvatarUrl(featureImageUrl) && (
						<img
							src={featureImageUrl}
							alt=""
							className="aspect-video w-full rounded-lg object-cover"
							loading="lazy"
						/>
					)}
					<span
						className="text-[10px] font-bold uppercase tracking-[0.2em]"
						style={{ color: mutedTextColor }}
					>
						In the spotlight
					</span>
				</div>
			)}
			<div className="flex items-center justify-between">
				<div className="min-w-0 flex items-center gap-3">
					<LinkIcon iconUrl={iconUrl} iconBgColor={iconBgColor} />
					<div className="min-w-0">
						<p
							className="font-medium text-sm truncate"
							style={{ color: textColor }}
						>
							{title}
						</p>
						{description && (
							<p
								className="text-xs mt-0.5 truncate"
								style={{ color: mutedTextColor }}
							>
								{description}
							</p>
						)}
					</div>
				</div>
				<ExternalLink
					aria-hidden="true"
					className="w-3.5 h-3.5 ml-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
					style={{ color: mutedTextColor }}
				/>
			</div>
			{featured && (
				<p className="mt-4 text-sm font-bold" style={{ color: textColor }}>
					{ctaLabel || "Explore more"} ↗
				</p>
			)}
		</a>
	);
}
