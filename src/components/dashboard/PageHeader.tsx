import type { ReactNode } from "react";
import { cn } from "#/lib/utils";

/** Shared dashboard page heading: eyebrow, display title, summary and actions. */
export function PageHeader({
	eyebrow,
	title,
	description,
	actions,
	className,
}: {
	eyebrow?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
	className?: string;
}) {
	return (
		<header
			className={cn(
				"mb-8 flex flex-col gap-5 border-b border-border pb-7 lg:flex-row lg:items-end lg:justify-between",
				className,
			)}
		>
			<div className="min-w-0 max-w-2xl">
				{eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
				<h1 className="text-foreground">{title}</h1>
				{description && (
					<p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">
						{description}
					</p>
				)}
			</div>
			{actions && (
				<div className="flex w-full flex-wrap gap-2 lg:w-auto lg:shrink-0 lg:justify-end">
					{actions}
				</div>
			)}
		</header>
	);
}
