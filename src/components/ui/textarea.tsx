import type * as React from "react";

import { cn } from "#/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"flex field-sizing-content min-h-16 w-full rounded-xl border border-input/60 bg-card px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/80 shadow-[inset_0_1px_0_rgb(22_20_15/0.03)] transition-[color,box-shadow,border-color] outline-none hover:border-input focus-visible:border-foreground focus-visible:ring-[3px] focus-visible:ring-signal/20 disabled:cursor-not-allowed disabled:opacity-50",
				"aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25",
				className,
			)}
			{...props}
		/>
	);
}

export { Textarea };
