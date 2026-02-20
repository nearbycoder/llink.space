import type { CSSProperties } from "react";
import { Link2 } from "lucide-react";
import { cn } from "#/lib/utils";

type SiteBrandSize = "sm" | "md" | "lg";

const markSizeByVariant: Record<SiteBrandSize, string> = {
	sm: "1.15rem",
	md: "1.35rem",
	lg: "1.6rem",
};

const textSizeByVariant: Record<SiteBrandSize, string> = {
	sm: "text-sm",
	md: "text-base",
	lg: "text-lg",
};

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
	text = "llink.space",
}: SiteBrandProps) {
	const style = {
		"--site-brand-size": markSizeByVariant[size],
	} as CSSProperties;

	return (
		<span className={cn("site-brand", className)} style={style}>
			<span className="site-brand__mark" aria-hidden="true">
				<span className="site-brand__mark-face">
					<Link2 className="site-brand__glyph" />
				</span>
			</span>
			{showText ? (
				<span
					className={cn(
						"tracking-tight text-[#11110F]",
						textSizeByVariant[size],
						textClassName,
					)}
					style={{ fontFamily: "'Archivo Black', sans-serif" }}
				>
					{text}
				</span>
			) : null}
		</span>
	);
}
