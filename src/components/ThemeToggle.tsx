import { Monitor, Moon, Sun } from "lucide-react";
import { type ThemePreference, useTheme } from "#/lib/theme";
import { useClientReady } from "#/lib/use-client-ready";
import { cn } from "#/lib/utils";

const OPTIONS: Array<{
	value: ThemePreference;
	label: string;
	Icon: typeof Sun;
}> = [
	{ value: "light", label: "Light", Icon: Sun },
	{ value: "dark", label: "Dark", Icon: Moon },
	{ value: "system", label: "System", Icon: Monitor },
];

/** Three-way Light / Dark / System control for settings-style placements. */
export function ThemeSwitcher({ className }: { className?: string }) {
	const ready = useClientReady();
	const { preference, setPreference } = useTheme();
	return (
		<fieldset
			aria-label="Color theme"
			className={cn(
				"m-0 flex rounded-full border border-border bg-card p-0.5",
				className,
			)}
		>
			{OPTIONS.map(({ value, label, Icon }) => (
				<button
					key={value}
					type="button"
					disabled={!ready}
					aria-pressed={ready && preference === value}
					aria-label={`${label} theme`}
					title={`${label} theme`}
					onClick={() => setPreference(value)}
					className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground"
				>
					<Icon className="size-3.5" aria-hidden="true" />
					<span className="sr-only sm:not-sr-only">{label}</span>
				</button>
			))}
		</fieldset>
	);
}

/** Single icon button that flips between light and dark. */
export function ThemeToggleButton({ className }: { className?: string }) {
	const ready = useClientReady();
	const { resolved, setPreference } = useTheme();
	const next = resolved === "dark" ? "light" : "dark";
	return (
		<button
			type="button"
			disabled={!ready}
			onClick={() => setPreference(next)}
			aria-label={`Switch to ${next} mode`}
			title={`Switch to ${next} mode`}
			className={cn(
				"inline-flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent",
				className,
			)}
		>
			{ready && resolved === "dark" ? (
				<Sun className="size-[1.1rem]" aria-hidden="true" />
			) : (
				<Moon className="size-[1.1rem]" aria-hidden="true" />
			)}
		</button>
	);
}
