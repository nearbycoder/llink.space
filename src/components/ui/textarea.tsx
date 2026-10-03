import type * as React from "react";

import { cn } from "#/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"flex field-sizing-content min-h-16 w-full rounded-xl border border-input bg-card px-3 py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground shadow-none transition-[color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50",
				"aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25",
				className,
			)}
			{...props}
		/>
	);
}

export { Textarea };
