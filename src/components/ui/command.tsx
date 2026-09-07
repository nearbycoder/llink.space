import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import type * as React from "react";
import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "#/components/ui/dialog";
import { useFixedBodyScroll } from "#/lib/use-fixed-body-scroll";
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
	open,
	...props
}: React.ComponentProps<typeof Dialog> & {
	children: React.ReactNode;
}) {
	useFixedBodyScroll(Boolean(open));
	const [viewport, setViewport] = useState<{
		height: number;
		top: number;
	} | null>(null);
	useEffect(() => {
		if (!open) return;
		const visual = window.visualViewport;
		// iOS keeps the layout viewport tall when the keyboard opens. Follow the
		// visible viewport instead, without interfering with intentional pinch zoom.
		const update = () => {
			if (visual && visual.scale !== 1) return;
			const height = visual?.height ?? window.innerHeight;
			const top = visual?.offsetTop ?? 0;
			setViewport((previous) =>
				previous?.height === height && previous.top === top
					? previous
					: { height, top },
			);
		};
		update();
		visual?.addEventListener("resize", update);
		visual?.addEventListener("scroll", update);
		window.addEventListener("resize", update);
		return () => {
			visual?.removeEventListener("resize", update);
			visual?.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
		};
	}, [open]);
	return (
		<Dialog open={open} {...props}>
			<DialogContent
				showCloseButton={false}
				className="dashboard-search-dialog flex max-h-[min(640px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 shadow-[4px_4px_0_0_#11110F]"
				style={
					viewport
						? ({
								"--search-viewport-height": `${viewport.height}px`,
								"--search-viewport-top": `${viewport.top}px`,
							} as React.CSSProperties)
						: undefined
				}
			>
				<DialogTitle className="sr-only">Command menu</DialogTitle>
				<DialogDescription className="sr-only">
					Search pages and actions, or create a link.
				</DialogDescription>
				<Command className="min-h-0 rounded-none border-0 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-[#6A675C] [&_[cmdk-item][data-disabled=true]]:pointer-events-none [&_[cmdk-item][data-disabled=true]]:opacity-50 [&_[cmdk-item][data-selected=true]]:bg-[#11110F] [&_[cmdk-item][data-selected=true]]:text-[#F5FF7B]">
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
			className="flex min-w-0 flex-1 items-center gap-3"
		>
			<Search className="size-5 shrink-0 text-[#6A675C]" aria-hidden="true" />
			<CommandPrimitive.Input
				data-slot="command-input"
				className={cn(
					"flex h-12 w-full min-w-0 rounded-none border-0 bg-transparent p-0 text-base shadow-none outline-none focus-visible:outline-none placeholder:text-[#6A675C] disabled:cursor-not-allowed disabled:opacity-50",
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
				"min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-2",
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
				"relative flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none select-none",
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
