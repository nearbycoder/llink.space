import type { CSSProperties } from "react";
import { cn } from "#/lib/utils";

type SiteBrandSize = "sm" | "md" | "lg";

const markSizeByVariant: Record<SiteBrandSize, string> = {
	sm: "1.25rem",
	md: "1.5rem",
	lg: "1.85rem",
};

const textSizeByVariant: Record<SiteBrandSize, string> = {
	sm: "text-[0.95rem]",
	md: "text-[1.15rem]",
	lg: "text-[1.4rem]",
};

/** The "ll·" mark: two ink strokes and a signal dot on a rounded tile. */
export function BrandMark({
	className,
	title,
}: {
	className?: string;
	title?: string;
}) {
	return (
		<svg
			viewBox="0 0 32 32"
			className={className}
			role={title ? "img" : undefined}
			aria-hidden={title ? undefined : true}
			aria-label={title}
		>
			<rect width="32" height="32" rx="9" fill="#16140F" />
			<rect x="8.5" y="7" width="4" height="18" rx="2" fill="#FAF8F3" />
			<rect x="15" y="7" width="4" height="18" rx="2" fill="#FAF8F3" />
			<circle cx="23.5" cy="22.5" r="2.75" fill="#FF5F1F" />
		</svg>
	);
}

interface SiteBrandProps {
	className?: string;
	textClassName?: string;
	showText?: boolean;
	size?: SiteBrandSize;
	text?: string;
}

export function SiteBrand({
	className,
	textClassName,
	showText = true,
	size = "md",
	text,
}: SiteBrandProps) {
	const style = {
		"--site-brand-size": markSizeByVariant[size],
	} as CSSProperties;

	return (
		<span className={cn("site-brand", className)} style={style}>
			<span className="site-brand__mark" aria-hidden="true">
				<BrandMark />
			</span>
			{showText ? (
				<span
					className={cn(
						"site-brand__word",
						textSizeByVariant[size],
						textClassName,
					)}
				>
					{text ?? "llink.space"}
				</span>
			) : null}
		</span>
	);
}
