import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "#/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-[-0.005em] transition-[color,background-color,border-color,box-shadow,transform] active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
	{
		variants: {
			variant: {
				default:
					"border border-transparent bg-primary text-primary-foreground hover:bg-primary/85",
				brand:
					"border border-transparent bg-signal text-ink hover:bg-[#ff7a45]",
				destructive:
					"border border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
				outline:
					"border border-border-strong bg-card text-foreground hover:border-foreground/40 hover:bg-accent",
				secondary:
					"border border-transparent bg-secondary text-secondary-foreground hover:bg-border",
				ghost: "border border-transparent text-foreground hover:bg-accent",
				link: "text-foreground underline decoration-border-strong underline-offset-4 hover:decoration-foreground",
			},
			size: {
				default: "h-9 px-4 py-2 has-[>svg]:px-3.5",
				xs: "h-6 gap-1 px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-8 gap-1.5 px-3 text-[13px] has-[>svg]:px-2.5",
				lg: "h-11 px-6 text-[15px] has-[>svg]:px-5",
				icon: "size-9",
				"icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-8",
				"icon-lg": "size-11",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant = "default",
	size = "default",
	asChild = false,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot.Root : "button";

	return (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
