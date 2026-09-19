import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "#/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-[color,background-color,border-color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-black/30",
	{
		variants: {
			variant: {
				default:
					"border border-transparent bg-[#263B25] text-white shadow-sm hover:bg-[#344D31]",
				destructive:
					"border border-transparent bg-[#B42318] text-white shadow-sm hover:bg-[#912018]",
				outline:
					"border border-border bg-card text-[#11110F] shadow-sm hover:bg-[#F8F8F4]",
				secondary:
					"border border-transparent bg-accent text-[#273B1D] shadow-none hover:bg-[#E2EBCF]",
				ghost:
					"border border-transparent text-[#11110F] shadow-none hover:bg-black/10",
				link: "text-[#11110F] underline-offset-4 hover:underline shadow-none",
			},
			size: {
				default: "h-9 px-4 py-2 has-[>svg]:px-3",
				xs: "h-6 gap-1 rounded-lg px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
				lg: "h-10 rounded-lg px-6 has-[>svg]:px-4",
				icon: "size-9",
				"icon-xs": "size-6 rounded-lg [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-8",
				"icon-lg": "size-10",
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
