import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Command as CommandIcon,
	ExternalLink,
	Globe,
	Link2,
	LogOut,
	PlusCircle,
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
	CommandSeparator,
	CommandShortcut,
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
			<div className="border-b-2 border-black bg-[#FFF7A8] px-4 py-3 sm:px-5">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="flex items-center gap-2 text-base font-semibold text-[#11110F]">
							<span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-[#11110F] text-[#F5FF7B] shadow-[2px_2px_0_0_#11110F]">
								<CommandIcon className="h-4 w-4" />
							</span>
							Command center
						</p>
						<p className="mt-1 text-xs text-[#4B4B45]">
							Jump between pages and add links quickly.
						</p>
					</div>
					<kbd className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-black/35 bg-white px-2 text-xs font-semibold text-[#11110F]">
						{isMac ? (
							<>
								<CommandIcon className="h-3.5 w-3.5" />
								<span className="leading-none text-xs font-semibold text-[#11110F]">
									K
								</span>
							</>
						) : (
							<span className="leading-none text-xs font-semibold text-[#11110F]">
								Ctrl K
							</span>
						)}
					</kbd>
				</div>

				<div className="mt-3 flex gap-2">
					<button
						type="button"
						onClick={() => {
							setMode("navigate");
							setActionError(null);
						}}
						className={cn(
							"inline-flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-all",
							mode === "navigate"
								? "border-black bg-[#11110F] text-[#F5FF7B] shadow-[2px_2px_0_0_#11110F]"
								: "border-black bg-[#FFFCEF] text-[#4B4B45] hover:bg-white",
						)}
					>
						<Globe className="h-3.5 w-3.5" />
						Navigate
					</button>
					<button
						type="button"
						onClick={() => {
							setMode("create");
							setActionError(null);
						}}
						className={cn(
							"inline-flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-all",
							mode === "create"
								? "border-black bg-[#11110F] text-[#F5FF7B] shadow-[2px_2px_0_0_#11110F]"
								: "border-black bg-[#FFFCEF] text-[#4B4B45] hover:bg-white",
						)}
					>
						<Link2 className="h-3.5 w-3.5" />
						Quick create
					</button>
				</div>
			</div>

			<div className="p-4 sm:p-5">
				{mode === "navigate" ? (
					<>
						<CommandInput
							autoFocus={open && mode === "navigate"}
							placeholder="Search pages and actions"
						/>
						<CommandList>
							<CommandEmpty>No matching actions.</CommandEmpty>

							<CommandGroup heading="Pages">
								{pageActions.map((action) => (
									<CommandItem
										key={action.id}
										className="group/item"
										value={`${action.label} ${action.description} ${action.keywords ?? ""}`}
										onSelect={() => {
											void executeAction(action);
										}}
									>
										<action.Icon className="h-4 w-4" />
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-semibold">
												{action.label}
											</p>
											<p className="truncate text-xs text-[#6A675C] group-data-[selected=true]/item:text-[#DDFBFD]">
												{action.description}
											</p>
										</div>
										<CommandShortcut>Enter</CommandShortcut>
									</CommandItem>
								))}
							</CommandGroup>

							<CommandSeparator />

							<CommandGroup heading="Actions">
								{utilityActions.map((action) => (
									<CommandItem
										key={action.id}
										className="group/item"
										value={`${action.label} ${action.description} ${action.keywords ?? ""}`}
										disabled={action.disabled}
										onSelect={() => {
											void executeAction(action);
										}}
									>
										<action.Icon className="h-4 w-4" />
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-semibold">
												{action.label}
											</p>
											<p className="truncate text-xs text-[#6A675C] group-data-[selected=true]/item:text-[#DDFBFD]">
												{action.description}
											</p>
										</div>
										<CommandShortcut>Enter</CommandShortcut>
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>

						{actionError && (
							<p className="mt-3 rounded-lg border border-[#D94841]/40 bg-[#FFF1EE] px-3 py-2 text-xs text-[#B42318]">
								{actionError}
							</p>
						)}
					</>
				) : (
					<div className="space-y-3">
						{createError && (
							<p className="rounded-lg border border-[#D94841]/40 bg-[#FFF1EE] px-3 py-2 text-xs text-[#B42318]">
								{createError}
							</p>
						)}
						<div className="max-h-[65svh] overflow-y-auto pr-1">
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
					</div>
				)}
			</div>
		</CommandDialog>
	);
}
