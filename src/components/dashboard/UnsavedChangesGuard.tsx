import { useBlocker } from "@tanstack/react-router";
import {
	createContext,
	type RefObject,
	useCallback,
	useContext,
	useEffect,
} from "react";

export const NavigationGuardContext = createContext<RefObject<
	() => boolean
> | null>(null);

export function UnsavedChangesGuard({ when }: { when: boolean }) {
	const actionGuard = useContext(NavigationGuardContext);
	const confirmLeave = useCallback(
		() =>
			!when ||
			window.confirm(
				"You have unsaved changes. Leave this page and discard them?",
			),
		[when],
	);
	useBlocker({
		shouldBlockFn: () => !confirmLeave(),
		enableBeforeUnload: when,
	});
	useEffect(() => {
		if (!actionGuard) return;
		actionGuard.current = confirmLeave;
		return () => {
			actionGuard.current = () => true;
		};
	}, [actionGuard, confirmLeave]);
	return null;
}
