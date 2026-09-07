import { Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
export function PublicPrint() {
	const button = useRef<HTMLButtonElement>(null);
	const [ready, setReady] = useState(false);
	useEffect(() => {
		setReady(true);
		const states = new Map<HTMLDetailsElement, boolean>();
		const prepare = () => {
			const root = button.current?.closest("[data-public-profile]");
			for (const el of root?.querySelectorAll<HTMLDetailsElement>(
				"details:not([data-print-hidden])",
			) ?? []) {
				if (!states.has(el)) states.set(el, el.open);
				el.open = true;
			}
		};
		const restore = () => {
			for (const [el, open] of states) el.open = open;
			states.clear();
		};
		window.addEventListener("beforeprint", prepare);
		window.addEventListener("afterprint", restore);
		return () => {
			restore();
			window.removeEventListener("beforeprint", prepare);
			window.removeEventListener("afterprint", restore);
		};
	}, []);
	return (
		<button
			ref={button}
			type="button"
			disabled={!ready}
			onClick={() => window.print()}
			className="inline-flex min-h-11 items-center gap-2 rounded-full border border-current/30 px-3 text-xs font-semibold"
		>
			<Printer className="h-4 w-4" aria-hidden="true" />
			Print page
		</button>
	);
}
