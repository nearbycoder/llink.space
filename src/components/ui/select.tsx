import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "#/lib/utils";

export interface SelectOption {
	value: string;
	label: React.ReactNode;
	/** Plain text used for typeahead and the closed trigger when `label` is not a string. */
	textValue?: string;
	description?: React.ReactNode;
	icon?: React.ReactNode;
	disabled?: boolean;
}

interface SelectProps
	extends Omit<
		React.ComponentProps<typeof SelectPrimitive.Trigger>,
		"value" | "defaultValue" | "onChange" | "dir"
	> {
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	options: readonly SelectOption[];
	placeholder?: React.ReactNode;
	size?: "sm" | "default";
	name?: string;
	required?: boolean;
	/** Extra classes for the floating list. */
	contentClassName?: string;
	align?: "start" | "center" | "end";
}

/**
 * Designed replacement for native selects. Built on Radix Select, so it keeps
 * keyboard navigation, typeahead and listbox semantics. The trigger exposes the
 * current value as `data-value` for tests and styling.
 */
export function Select({
	value,
	defaultValue,
	onValueChange,
	options,
	placeholder,
	size = "default",
	name,
	required,
	disabled,
	className,
	contentClassName,
	align = "start",
	...triggerProps
}: SelectProps) {
	return (
		<SelectPrimitive.Root
			value={value}
			defaultValue={defaultValue}
			onValueChange={onValueChange}
			name={name}
			required={required}
			disabled={disabled}
		>
			<SelectPrimitive.Trigger
				data-slot="select-trigger"
				data-size={size}
				data-value={value ?? ""}
				className={cn(
					"group/select inline-flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-input/60 bg-card px-3.5 text-left text-sm font-medium text-foreground transition-[border-color,box-shadow,background-color] outline-none",
					"hover:border-input focus-visible:border-foreground focus-visible:ring-[3px] focus-visible:ring-signal/20",
					"data-[state=open]:border-foreground data-[placeholder]:text-muted-foreground",
					"disabled:cursor-not-allowed disabled:opacity-50",
					"data-[size=default]:h-10 data-[size=sm]:h-8 data-[size=sm]:rounded-full data-[size=sm]:px-3 data-[size=sm]:text-[13px]",
					"[&>span]:min-w-0 [&>span]:truncate",
					className,
				)}
				{...triggerProps}
			>
				<SelectPrimitive.Value placeholder={placeholder} />
				<SelectPrimitive.Icon asChild>
					<ChevronDownIcon
						aria-hidden="true"
						className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/select:rotate-180"
					/>
				</SelectPrimitive.Icon>
			</SelectPrimitive.Trigger>
			<SelectPrimitive.Portal>
				<SelectPrimitive.Content
					data-slot="select-content"
					position="popper"
					sideOffset={6}
					align={align}
					collisionPadding={12}
					className={cn(
						"relative z-50 max-h-[min(22rem,var(--radix-select-content-available-height))] min-w-[max(var(--radix-select-trigger-width),10rem)] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-[0_18px_48px_-16px_rgb(22_20_15/0.35)]",
						"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
						contentClassName,
					)}
				>
					<SelectPrimitive.ScrollUpButton className="flex h-6 cursor-default items-center justify-center text-muted-foreground">
						<ChevronDownIcon className="size-4 rotate-180" aria-hidden="true" />
					</SelectPrimitive.ScrollUpButton>
					<SelectPrimitive.Viewport className="p-1">
						{options.map((option) => (
							<SelectPrimitive.Item
								key={option.value}
								value={option.value}
								disabled={option.disabled}
								textValue={
									option.textValue ??
									(typeof option.label === "string" ? option.label : undefined)
								}
								data-slot="select-item"
								data-value={option.value}
								className={cn(
									"relative flex w-full cursor-pointer items-center gap-2.5 rounded-xl py-2 pr-9 pl-2.5 text-sm outline-none select-none",
									"data-[highlighted]:bg-accent data-[state=checked]:font-semibold",
									"data-[disabled]:pointer-events-none data-[disabled]:opacity-45",
								)}
							>
								{option.icon && (
									<span
										aria-hidden="true"
										className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4"
									>
										{option.icon}
									</span>
								)}
								<span className="min-w-0 flex-1">
									<SelectPrimitive.ItemText>
										{option.label}
									</SelectPrimitive.ItemText>
									{option.description && (
										<span className="mt-0.5 block text-xs font-normal text-muted-foreground">
											{option.description}
										</span>
									)}
								</span>
								<SelectPrimitive.ItemIndicator className="absolute right-3 flex items-center text-signal-strong">
									<CheckIcon className="size-4" aria-hidden="true" />
								</SelectPrimitive.ItemIndicator>
							</SelectPrimitive.Item>
						))}
					</SelectPrimitive.Viewport>
					<SelectPrimitive.ScrollDownButton className="flex h-6 cursor-default items-center justify-center text-muted-foreground">
						<ChevronDownIcon className="size-4" aria-hidden="true" />
					</SelectPrimitive.ScrollDownButton>
				</SelectPrimitive.Content>
			</SelectPrimitive.Portal>
		</SelectPrimitive.Root>
	);
}
