import type { ComponentProps } from "react";
import { cn } from "#/lib/utils";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			aria-hidden="true"
			className={cn("loading-shimmer rounded-md bg-[#E9E5D3]", className)}
			{...props}
		/>
	);
}

export function LoadingRegion({
	label,
	className,
	children,
}: {
	label: string;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div
			role="status"
			aria-live="polite"
			aria-busy="true"
			className={className}
		>
			<span className="sr-only">{label}</span>
			{children}
		</div>
	);
}
