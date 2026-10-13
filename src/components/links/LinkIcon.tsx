import { Link2 } from "lucide-react";
import { useState } from "react";
import { isLinkIconKey } from "#/lib/link-icon-keys";
import { cn, DEFAULT_ICON_BG_COLOR, readableTextColor } from "#/lib/utils";
import { LINK_ICON_OPTIONS_BY_KEY } from "./icon-options";

interface LinkIconProps {
	iconUrl?: string | null;
	iconBgColor?: string | null;
	className?: string;
	imgClassName?: string;
	glyphClassName?: string;
}

export function LinkIcon({
	iconUrl,
	iconBgColor,
	className,
	imgClassName,
	glyphClassName,
}: LinkIconProps) {
	const [isBroken, setIsBroken] = useState(false);
	const normalizedIcon = iconUrl?.trim() ?? "";
	const isIconKey = normalizedIcon.length > 0 && isLinkIconKey(normalizedIcon);
	const showImage = normalizedIcon.length > 0 && !isIconKey && !isBroken;
	const iconOption = isIconKey
		? LINK_ICON_OPTIONS_BY_KEY[normalizedIcon]
		: undefined;
	const background = iconBgColor ?? DEFAULT_ICON_BG_COLOR;

	return (
		<span
			className={cn(
				"inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[10px] shadow-[inset_0_0_0_1px_rgb(22_20_15/0.08)]",
				className,
			)}
			style={{
				backgroundColor: background,
				color: readableTextColor(background),
			}}
		>
			{iconOption ? (
				<iconOption.Icon
					aria-hidden="true"
					className={cn("h-4 w-4", glyphClassName)}
				/>
			) : showImage ? (
				<img
					src={normalizedIcon}
					alt=""
					aria-hidden="true"
					loading="lazy"
					className={cn("h-full w-full object-cover", imgClassName)}
					onError={() => setIsBroken(true)}
				/>
			) : (
				<Link2 aria-hidden="true" className={cn("h-4 w-4", glyphClassName)} />
			)}
		</span>
	);
}
