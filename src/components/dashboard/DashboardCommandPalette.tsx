import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Command as CommandIcon,
	ExternalLink,
	Globe,
	Link2,
	LoaderCircle,
	LogOut,
	PlusCircle,
} from "lucide-react";
import {
	type FormEvent,
	type ReactNode,
	useEffect,
	useId,
	useMemo,
	useState,
} from "react";
import { Button } from "#/components/ui/button";
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
import { Input } from "#/components/ui/input";
import { useTRPC } from "#/integrations/trpc/react";
import { isSafeHttpUrl, normalizeHttpUrl } from "#/lib/security";
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
	const [quickTitle, setQuickTitle] = useState("");
	const [quickUrl, setQuickUrl] = useState("");
	const [createError, setCreateError] = useState<string | null>(null);
	const [isMac, setIsMac] = useState(false);
	const quickTitleId = useId();
	const quickUrlId = useId();

	useEffect(() => {
		setIsMac(isMacPlatform());
	}, []);

	useEffect(() => {
		if (open) return;
		setMode("navigate");
		setActionError(null);
		setCreateError(null);
		setQuickTitle("");
		setQuickUrl("");
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

	const handleQuickCreate = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setCreateError(null);

		const title = quickTitle.trim();
		const rawUrl = quickUrl.trim();

		if (!title) {
			setCreateError("Title is required.");
			return;
		}
		if (!rawUrl) {
			setCreateError("URL is required.");
			return;
		}
		if (!isSafeHttpUrl(rawUrl)) {
			setCreateError("URL must start with http:// or https://.");
			return;
		}

		try {
			await addLink.mutateAsync({
				title,
				url: normalizeHttpUrl(rawUrl) ?? rawUrl,
				isActive: true,
			});

			await queryClient.invalidateQueries({
				queryKey: linksQueryOptions.queryKey,
			});

			setQuickTitle("");
			setQuickUrl("");
			onOpenChange(false);
		} catch (error) {
			setCreateError(
				error instanceof Error ? error.message : "Failed to create link.",
			);
		}
	};

	const shortcutLabel = isMac ? "\u2318K" : "Ctrl K";

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
					<kbd className="rounded-lg border-2 border-black bg-[#FFFCEF] px-2 py-1 text-[11px] font-semibold text-[#11110F] shadow-[2px_2px_0_0_#11110F]">
						{shortcutLabel}
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
											<p className="truncate text-xs text-[#6A675C] data-[selected=true]:text-[#F5FF7B]/80">
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
											<p className="truncate text-xs text-[#6A675C] data-[selected=true]:text-[#F5FF7B]/80">
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
					<form onSubmit={handleQuickCreate} className="space-y-3">
						<div className="space-y-1.5">
							<label
								htmlFor={quickTitleId}
								className="text-xs font-semibold uppercase tracking-wide text-[#4B4B45]"
							>
								Title
							</label>
							<Input
								id={quickTitleId}
								autoFocus={open && mode === "create"}
								value={quickTitle}
								onChange={(event) => setQuickTitle(event.target.value)}
								placeholder="e.g. My portfolio"
							/>
						</div>

						<div className="space-y-1.5">
							<label
								htmlFor={quickUrlId}
								className="text-xs font-semibold uppercase tracking-wide text-[#4B4B45]"
							>
								URL
							</label>
							<Input
								id={quickUrlId}
								type="url"
								value={quickUrl}
								onChange={(event) => setQuickUrl(event.target.value)}
								placeholder="https://example.com"
							/>
						</div>

						{createError && (
							<p className="rounded-lg border border-[#D94841]/40 bg-[#FFF1EE] px-3 py-2 text-xs text-[#B42318]">
								{createError}
							</p>
						)}

						<div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
							<Button
								type="button"
								variant="outline"
								onClick={() => setMode("navigate")}
							>
								Back to actions
							</Button>
							<Button type="submit" disabled={addLink.isPending}>
								{addLink.isPending ? (
									<>
										<LoaderCircle className="h-4 w-4 animate-spin" />
										Creating...
									</>
								) : (
									"Create link"
								)}
							</Button>
						</div>
					</form>
				)}
			</div>
		</CommandDialog>
	);
}
