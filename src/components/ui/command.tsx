import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import type * as React from "react";
import { Dialog, DialogContent } from "#/components/ui/dialog";
import { cn } from "#/lib/utils";

function Command({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive>) {
	return (
		<CommandPrimitive
			data-slot="command"
			className={cn(
				"flex h-full w-full flex-col overflow-hidden rounded-xl border-2 border-black bg-[#FFFCEF] text-[#11110F]",
				className,
			)}
			{...props}
		/>
	);
}

function CommandDialog({
	children,
	...props
}: React.ComponentProps<typeof Dialog> & {
	children: React.ReactNode;
}) {
	return (
		<Dialog {...props}>
			<DialogContent
				showCloseButton={false}
				className="overflow-hidden p-0 shadow-[8px_8px_0_0_#11110F]"
			>
				<Command className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-[#6A675C] [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:border-t-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:border-black/15 [&_[cmdk-group]]:px-1 [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input]]:h-11 [&_[cmdk-item]]:mx-1 [&_[cmdk-item]]:my-1 [&_[cmdk-item]]:rounded-xl [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2 [&_[cmdk-item]]:text-sm [&_[cmdk-item]]:font-medium [&_[cmdk-item]]:outline-none [&_[cmdk-item][data-disabled=true]]:pointer-events-none [&_[cmdk-item][data-disabled=true]]:opacity-50 [&_[cmdk-item][data-selected=true]]:border-black [&_[cmdk-item][data-selected=true]]:bg-[#11110F] [&_[cmdk-item][data-selected=true]]:text-[#F5FF7B] [&_[cmdk-list]]:max-h-[340px] [&_[cmdk-list]]:overflow-y-auto [&_[cmdk-separator]]:mx-2 [&_[cmdk-separator]]:h-px [&_[cmdk-separator]]:bg-black/15">
					{children}
				</Command>
			</DialogContent>
		</Dialog>
	);
}

function CommandInput({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
	return (
		<div
			data-slot="command-input-wrapper"
			className="flex items-center gap-2 border-b-2 border-black/20 px-3"
		>
			<Search className="shrink-0 text-[#6A675C]" />
			<CommandPrimitive.Input
				data-slot="command-input"
				className={cn(
					"flex h-11 w-full rounded-lg bg-transparent text-sm outline-none placeholder:text-[#6A675C] disabled:cursor-not-allowed disabled:opacity-50",
					className,
				)}
				{...props}
			/>
		</div>
	);
}

function CommandList({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
	return (
		<CommandPrimitive.List
			data-slot="command-list"
			className={cn(
				"max-h-[300px] overflow-y-auto overflow-x-hidden",
				className,
			)}
			{...props}
		/>
	);
}

function CommandEmpty({
	...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
	return (
		<CommandPrimitive.Empty
			data-slot="command-empty"
			className="py-8 text-center text-sm text-[#6A675C]"
			{...props}
		/>
	);
}

function CommandGroup({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
	return (
		<CommandPrimitive.Group
			data-slot="command-group"
			className={cn("overflow-hidden p-1 text-[#11110F]", className)}
			{...props}
		/>
	);
}

function CommandSeparator({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
	return (
		<CommandPrimitive.Separator
			data-slot="command-separator"
			className={cn("-mx-1 h-px bg-black/15", className)}
			{...props}
		/>
	);
}

function CommandItem({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
	return (
		<CommandPrimitive.Item
			data-slot="command-item"
			className={cn(
				"relative flex cursor-default items-center gap-2 rounded-xl border-2 border-transparent px-3 py-2 text-sm outline-none select-none data-[selected=true]:shadow-[2px_2px_0_0_#11110F]",
				className,
			)}
			{...props}
		/>
	);
}

function CommandShortcut({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			data-slot="command-shortcut"
			className={cn(
				"ml-auto text-[11px] font-medium tracking-wide text-[#6A675C] group-data-[selected=true]/item:text-[#DDFBFD]",
				className,
			)}
			{...props}
		/>
	);
}

export {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
};
