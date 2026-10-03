import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
/** Keep server-rendered controls inactive until React can handle their events. */
export function useClientReady() {
	return useSyncExternalStore(
		subscribe,
		() => true,
		() => false,
	);
}
