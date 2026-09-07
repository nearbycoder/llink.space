import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Command as CommandIcon,
	ExternalLink,
	Link2,
	LogOut,
	PlusCircle,
	X,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { LinkForm, type LinkFormData } from "#/components/dashboard/LinkForm";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "#/components/ui/command";
import { useTRPC } from "#/integrations/trpc/react";
import { cn } from "#/lib/utils";

interface IconProps {
	className?: string;
}

export interface DashboardCommandShortcut {
	id: string;
	label: string;
	description: string;
	keywords?: string;
	Icon: (props: IconProps) => ReactNode;
	onSelect: () => void | Promise<void>;
}

interface DashboardCommandPaletteProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	shortcuts: DashboardCommandShortcut[];
	username?: string | null;
	onSignOut: () => void | Promise<void>;
}

type PaletteMode = "navigate" | "create";

type CommandAction = {
	id: string;
	label: string;
	description: string;
	keywords?: string;
	Icon: (props: IconProps) => ReactNode;
	disabled?: boolean;
	run: () => void | Promise<void>;
};

function isMacPlatform() {
	if (typeof navigator === "undefined") return false;
	return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

export function DashboardCommandPalette({
	open,
	onOpenChange,
	shortcuts,
	username,
	onSignOut,
}: DashboardCommandPaletteProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const addLink = useMutation(trpc.links.add.mutationOptions());
	const linksQueryOptions = trpc.links.list.queryOptions();

	const [mode, setMode] = useState<PaletteMode>("navigate");
	const [actionError, setActionError] = useState<string | null>(null);
	const [createError, setCreateError] = useState<string | null>(null);
	const [isMac, setIsMac] = useState(false);
	const { data: layoutData } = useQuery({
		...linksQueryOptions,
		enabled: open,
	});

	useEffect(() => {
		setIsMac(isMacPlatform());
	}, []);

	useEffect(() => {
		if (open) return;
		setMode("navigate");
		setActionError(null);
		setCreateError(null);
	}, [open]);

	const pageActions = useMemo<CommandAction[]>(
		() =>
			shortcuts.map((shortcut) => ({
				id: shortcut.id,
				label: shortcut.label,
				description: shortcut.description,
				keywords: shortcut.keywords,
				Icon: shortcut.Icon,
				run: async () => {
					await Promise.resolve(shortcut.onSelect());
					onOpenChange(false);
				},
			})),
		[shortcuts, onOpenChange],
	);

	const utilityActions = useMemo<CommandAction[]>(
		() => [
			{
				id: "quick-create-link",
				label: "Quick create link",
				description: "Open a compact form to add a new link",
				keywords: "add new link create",
				Icon: PlusCircle,
				run: () => {
					setMode("create");
					setActionError(null);
					setCreateError(null);
				},
			},
			{
				id: "open-public-page",
				label: "Open public page",
				description: username
					? `View /u/${username} in a new tab`
					: "Set up a username to unlock this",
				keywords: "preview profile",
				Icon: ExternalLink,
				disabled: !username,
				run: () => {
					if (!username) return;
					window.open(`/u/${username}`, "_blank", "noopener,noreferrer");
					onOpenChange(false);
				},
			},
			{
				id: "sign-out",
				label: "Sign out",
				description: "Log out from your account",
				keywords: "logout",
				Icon: LogOut,
				run: async () => {
					await Promise.resolve(onSignOut());
					onOpenChange(false);
				},
			},
		],
		[onOpenChange, onSignOut, username],
	);

	const executeAction = async (action: CommandAction) => {
		if (action.disabled) return;
		setActionError(null);
		try {
			await Promise.resolve(action.run());
		} catch (error) {
			setActionError(
				error instanceof Error
					? error.message
					: "Unable to run that action right now.",
			);
		}
	};

	const handleQuickCreate = async (data: LinkFormData) => {
		setCreateError(null);

		try {
			await addLink.mutateAsync(data);

			await queryClient.invalidateQueries({
				queryKey: linksQueryOptions.queryKey,
			});

			onOpenChange(false);
		} catch (error) {
			setCreateError(
				error instanceof Error ? error.message : "Failed to create link.",
			);
		}
	};

	return (
		<CommandDialog open={open} onOpenChange={onOpenChange}>
			<div className="shrink-0 border-b border-black/15">
				<div className="flex items-center gap-2 px-4 py-2">
					{mode === "navigate" ? (
						<CommandInput
							autoFocus={open}
							aria-label="Search pages and actions"
							placeholder="Find a page or action"
							autoComplete="off"
							autoCorrect="off"
							autoCapitalize="none"
							spellCheck={false}
						/>
					) : (
						<div className="flex h-12 flex-1 items-center gap-3 text-base font-semibold">
							<PlusCircle className="size-5" aria-hidden="true" />
							Create a link
						</div>
					)}
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						aria-label="Close search"
						className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-black/5 text-[#4B4B45] transition-colors hover:bg-black/10 focus-visible:outline-offset-0"
					>
						<X className="size-5" aria-hidden="true" />
					</button>
				</div>
				<fieldset className="flex gap-1 px-3 pb-3" aria-label="Search mode">
					<button
						type="button"
						aria-pressed={mode === "navigate"}
						onClick={() => {
							setMode("navigate");
							setActionError(null);
						}}
						className={cn(
							"min-h-11 whitespace-nowrap rounded-xl px-3 text-sm font-semibold transition-colors",
							mode === "navigate"
								? "bg-[#F5FF7B] text-[#11110F]"
								: "text-[#6A675C] hover:bg-black/5",
						)}
					>
						Search
					</button>
					<button
						type="button"
						aria-pressed={mode === "create"}
						onClick={() => {
							setMode("create");
							setActionError(null);
						}}
						className={cn(
							"inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-semibold transition-colors",
							mode === "create"
								? "bg-[#F5FF7B] text-[#11110F]"
								: "text-[#6A675C] hover:bg-black/5",
						)}
					>
						<Link2 className="size-4" aria-hidden="true" />
						Quick create
					</button>
				</fieldset>
			</div>
			{mode === "navigate" ? (
				<>
					<CommandList>
						<CommandEmpty>
							<p className="font-semibold text-[#11110F]">No matches found</p>
							<p className="mt-1">Try a page name or “add link”.</p>
						</CommandEmpty>
						{[
							{ heading: "Pages", actions: pageActions },
							{ heading: "Actions", actions: utilityActions },
						].map((group, index) => (
							<CommandGroup
								key={group.heading}
								heading={group.heading}
								className={index ? "border-t border-black/10" : undefined}
							>
								{group.actions.map((action) => (
									<CommandItem
										key={action.id}
										className="group/item"
										aria-label={action.label}
										value={`${action.label} ${action.description} ${action.keywords ?? ""}`}
										disabled={action.disabled}
										onSelect={() => {
											void executeAction(action);
										}}
									>
										<action.Icon className="size-[18px] shrink-0" />
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-semibold">
												{action.label.replace(/^Go to /, "")}
											</p>
											<p
												data-slot="command-item-description"
												className="hidden truncate text-xs text-[#6A675C] sm:block group-data-[selected=true]/item:text-[#DDFBFD]"
											>
												{action.description}
											</p>
										</div>
									</CommandItem>
								))}
							</CommandGroup>
						))}
					</CommandList>
					{actionError && (
						<p
							role="alert"
							className="mx-3 mb-3 rounded-lg border border-[#D94841]/40 bg-[#FFF1EE] px-3 py-2 text-xs text-[#B42318]"
						>
							{actionError}
						</p>
					)}
					<div
						data-slot="command-keyboard-help"
						className="hidden shrink-0 items-center justify-between border-t border-black/15 bg-black/[0.025] px-4 py-3 text-xs text-[#6A675C] sm:flex"
					>
						<span>
							↑ ↓ to browse <span className="mx-2 text-black/20">/</span> ↵ to
							open
						</span>
						<kbd className="inline-flex items-center gap-1 font-medium">
							{isMac ? (
								<>
									<CommandIcon className="size-3" aria-hidden="true" /> K
								</>
							) : (
								"Ctrl K"
							)}
						</kbd>
					</div>
				</>
			) : (
				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
					{createError && (
						<p
							role="alert"
							className="mb-3 rounded-lg border border-[#D94841]/40 bg-[#FFF1EE] px-3 py-2 text-xs text-[#B42318]"
						>
							{createError}
						</p>
					)}
					<LinkForm
						sections={layoutData?.sections ?? []}
						onSubmit={handleQuickCreate}
						onCancel={() => {
							setMode("navigate");
							setCreateError(null);
						}}
						submitLabel="Create link"
						cancelLabel="Back to actions"
					/>
				</div>
			)}
		</CommandDialog>
	);
}
