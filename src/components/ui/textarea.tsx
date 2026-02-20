import type * as React from "react";

import { cn } from "#/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"flex field-sizing-content min-h-16 w-full rounded-xl border-2 border-black bg-[#FFFDF5] px-3 py-2 text-sm text-[#11110F] placeholder:text-[#6A675C] shadow-[2px_2px_0_0_#11110F] transition-[color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:cursor-not-allowed disabled:opacity-50",
				"aria-invalid:border-[#D94841] aria-invalid:ring-2 aria-invalid:ring-[#D94841]/25",
				className,
			)}
			{...props}
		/>
	);
}

export { Textarea };
