import * as React from "react"

import { cn } from "#/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border-2 border-black bg-[#FFFDF5] px-3 py-2 text-sm text-[#11110F] placeholder:text-[#6A675C] shadow-[2px_2px_0_0_#11110F] transition-[color,box-shadow,transform] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:ring-2 focus-visible:ring-black/25",
        "aria-invalid:border-[#D94841] aria-invalid:ring-2 aria-invalid:ring-[#D94841]/25",
        className
      )}
      {...props}
    />
  )
}

export { Input }
