import { useLayoutEffect } from "react";

/** Freeze the page itself; overflow locking alone permits keyboard/focus scrolling. */
export function useFixedBodyScroll(locked: boolean) {
	useLayoutEffect(() => {
		if (!locked) return;
		const body = document.body;
		const root = document.documentElement;
		const { scrollX, scrollY } = window;
		const url = window.location.href;
		const scrollbarWidth = window.innerWidth - root.clientWidth;
		const restore: Array<() => void> = [];
		const setStyle = (
			style: CSSStyleDeclaration,
			property: string,
			value: string,
		) => {
			const previous = style.getPropertyValue(property);
			const priority = style.getPropertyPriority(property);
			restore.push(() => {
				if (previous) style.setProperty(property, previous, priority);
				else style.removeProperty(property);
			});
			// Radix sets body position: relative !important while its lock is active.
			style.setProperty(property, value, "important");
		};

		setStyle(body.style, "position", "fixed");
		setStyle(body.style, "top", `${-scrollY}px`);
		setStyle(body.style, "left", `${-scrollX}px`);
		setStyle(body.style, "width", `calc(100% - ${scrollbarWidth}px)`);
		setStyle(root.style, "overflow", "hidden");
		setStyle(root.style, "overscroll-behavior", "none");

		return () => {
			for (const reset of restore) reset();
			// Let the router choose the destination's scroll position after navigation.
			if (window.location.href === url) {
				window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
			}
		};
	}, [locked]);
}
