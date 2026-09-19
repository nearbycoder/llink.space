import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { authClient } from "#/lib/auth-client";
import { sessionLabel } from "#/lib/session-label";

type SessionSummary = {
	id: string;
	userAgent?: string | null;
	createdAt: Date;
	expiresAt: Date;
};
export function AccountSessions() {
	const [ready, setReady] = useState(false);
	const [open, setOpen] = useState(false);
	const panelId = useId();
	useEffect(() => setReady(true), []);
	const [sessions, setSessions] = useState<SessionSummary[]>([]);
	const [currentId, setCurrentId] = useState("");
	const [busy, setBusy] = useState(false);
	const [loaded, setLoaded] = useState(false);
	const [error, setError] = useState("");
	const [confirm, setConfirm] = useState(false);
	const others = sessions.filter((session) => session.id !== currentId);
	async function refresh() {
		setBusy(true);
		setError("");
		try {
			const [list, current] = await Promise.all([
				authClient.listSessions(),
				authClient.getSession(),
			]);
			if (list.error || current.error || !list.data || !current.data)
				throw new Error(
					"Could not load sessions. Sign in again if your session is no longer fresh.",
				);
			setCurrentId(current.data.session.id);
			setSessions(
				list.data.map(({ id, userAgent, createdAt, expiresAt }) => ({
					id,
					userAgent,
					createdAt,
					expiresAt,
				})),
			);
			setLoaded(true);
		} catch {
			setError(
				"Could not load sessions. Refresh to retry, or sign in again to review your devices.",
			);
		} finally {
			setBusy(false);
		}
	}
	async function revokeOthers() {
		setBusy(true);
		setError("");
		try {
			const result = await authClient.revokeOtherSessions();
			if (result.error)
				throw new Error(
					"Could not sign out other devices. Sign in again and retry.",
				);
			setConfirm(false);
			toast.success("Other devices signed out");
			await refresh();
		} catch {
			setError("Could not sign out other devices. Sign in again and retry.");
		} finally {
			setBusy(false);
		}
	}
	return (
		<section className="kinetic-panel mt-6 p-5">
			<button
				type="button"
				className="min-h-11 text-left text-lg font-bold"
				disabled={!ready}
				aria-expanded={open}
				aria-controls={panelId}
				onClick={() => {
					setOpen(!open);
					if (!open) void refresh();
				}}
			>
				Active sessions
			</button>
			<div id={panelId} hidden={!open}>
				<p className="my-3 text-sm">
					Review where you’re signed in. Device labels are based on browser
					information.
				</p>
				{error && (
					<p role="alert" className="mb-3 text-sm text-red-700">
						{error}
					</p>
				)}
				<div className="mb-3 flex flex-wrap gap-2">
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={busy}
						onClick={() => void refresh()}
					>
						Refresh sessions
					</Button>
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={busy || !loaded || !currentId || !others.length}
						onClick={() => setConfirm(true)}
					>
						Sign out other devices
					</Button>
				</div>
				<p role="status" className="text-xs">
					{busy
						? "Updating sessions…"
						: loaded
							? `${sessions.length} active session${sessions.length === 1 ? "" : "s"}`
							: "Open to load your active sessions."}
				</p>
				<ul className="mt-3 divide-y divide-black/15">
					{sessions.map((session) => (
						<li key={session.id} className="py-3">
							<p className="text-sm font-semibold">
								{sessionLabel(session.userAgent)}
								{session.id === currentId && (
									<span className="ml-2 rounded-full bg-[#F5FF7B] px-2 py-1 text-xs">
										This session
									</span>
								)}
							</p>
							<p className="mt-2 text-xs">
								Started {new Date(session.createdAt).toLocaleString()} · Expires{" "}
								{new Date(session.expiresAt).toLocaleString()}
							</p>
						</li>
					))}
				</ul>
				<Dialog
					open={confirm}
					onOpenChange={(next) => {
						if (!busy) setConfirm(next);
					}}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Sign out other devices?</DialogTitle>
							<DialogDescription>
								You’ll stay signed in here. Your other devices will need to sign
								in again.
							</DialogDescription>
						</DialogHeader>
						{error && (
							<p role="alert" className="text-sm text-red-700">
								{error}
							</p>
						)}
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								disabled={busy}
								onClick={() => void revokeOthers()}
							>
								{busy ? "Signing out…" : "Sign out other devices"}
							</Button>
							<Button
								type="button"
								variant="outline"
								disabled={busy}
								onClick={() => setConfirm(false)}
							>
								Cancel
							</Button>
						</div>
					</DialogContent>
				</Dialog>
			</div>
		</section>
	);
}
