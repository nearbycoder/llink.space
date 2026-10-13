import { useCallback, useSyncExternalStore } from "react";

export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "llink-theme";
const THEME_EVENT = "llink-theme-change";

/**
 * Runs in <head> before first paint so returning visitors never see a flash of
 * the wrong theme. Kept dependency-free because it is inlined as a string.
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||((p!=="light")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})();`;

export function isThemePreference(value: unknown): value is ThemePreference {
	return value === "light" || value === "dark" || value === "system";
}

export function resolveTheme(
	preference: ThemePreference,
	systemDark: boolean,
): "light" | "dark" {
	if (preference === "system") return systemDark ? "dark" : "light";
	return preference;
}

// Used when storage is blocked, so a choice still sticks for this page.
let memoryPreference: ThemePreference = "system";

function readPreference(): ThemePreference {
	try {
		const stored = localStorage.getItem(THEME_STORAGE_KEY);
		return isThemePreference(stored) ? stored : "system";
	} catch {
		return memoryPreference;
	}
}

function systemQuery() {
	return window.matchMedia("(prefers-color-scheme: dark)");
}

function applyTheme(preference: ThemePreference) {
	document.documentElement.classList.toggle(
		"dark",
		resolveTheme(preference, systemQuery().matches) === "dark",
	);
}

function subscribe(onChange: () => void) {
	const query = systemQuery();
	const onSystemChange = () => {
		applyTheme(readPreference());
		onChange();
	};
	const onStorage = (event: StorageEvent) => {
		if (event.key !== THEME_STORAGE_KEY) return;
		applyTheme(readPreference());
		onChange();
	};
	query.addEventListener("change", onSystemChange);
	window.addEventListener("storage", onStorage);
	window.addEventListener(THEME_EVENT, onChange);
	return () => {
		query.removeEventListener("change", onSystemChange);
		window.removeEventListener("storage", onStorage);
		window.removeEventListener(THEME_EVENT, onChange);
	};
}

/** Theme preference shared across the app, synced between tabs. */
export function useTheme() {
	const preference = useSyncExternalStore(
		subscribe,
		readPreference,
		() => "system" as const,
	);
	const systemDark = useSyncExternalStore(
		subscribe,
		() => systemQuery().matches,
		() => false,
	);
	const setPreference = useCallback((next: ThemePreference) => {
		memoryPreference = next;
		try {
			if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
			else localStorage.setItem(THEME_STORAGE_KEY, next);
		} catch {
			// Storage can be unavailable; the choice still applies to this page.
		}
		applyTheme(next);
		window.dispatchEvent(new Event(THEME_EVENT));
	}, []);
	return {
		preference,
		resolved: resolveTheme(preference, systemDark),
		setPreference,
	};
}
