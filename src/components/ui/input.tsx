import type * as React from "react";
import { forwardRef } from "react";

import { cn } from "#/lib/utils";

const Input = forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
	({ className, type, ...props }, ref) => {
		return (
			<input
				ref={ref}
				type={type}
				data-slot="input"
				className={cn(
					"h-10 w-full min-w-0 rounded-xl border border-input bg-card px-3 py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground shadow-none transition-[color,box-shadow,transform] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
					"focus-visible:ring-2 focus-visible:ring-ring/25",
					"aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25",
					className,
				)}
				{...props}
			/>
		);
	},
);

Input.displayName = "Input";

export { Input };
