import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "#/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-black/30",
  {
    variants: {
      variant: {
        default:
          "border-2 border-black bg-[#11110F] text-[#F5FF7B] shadow-[2px_2px_0_0_#11110F] hover:-translate-y-0.5",
        destructive:
          "border-2 border-black bg-[#FF8A4C] text-black shadow-[2px_2px_0_0_#11110F] hover:-translate-y-0.5",
        outline:
          "border-2 border-black bg-[#FFFCEF] text-[#11110F] shadow-[2px_2px_0_0_#11110F] hover:bg-[#F8F8F4]",
        secondary:
          "border-2 border-black bg-[#8AE1E7] text-[#11110F] shadow-[2px_2px_0_0_#11110F] hover:-translate-y-0.5",
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
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
