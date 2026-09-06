import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTRPC } from "#/integrations/trpc/react";
export function EmailSignup({
	profileId,
	title,
	creator,
	preview = false,
}: {
	profileId: string;
	title: string;
	creator: string;
	preview?: boolean;
}) {
	const trpc = useTRPC();
	const subscribe = useMutation(trpc.audience.subscribe.mutationOptions());
	const undo = useMutation(trpc.audience.unsubscribe.mutationOptions());
	const [ready, setReady] = useState(false);
	useEffect(() => setReady(true), []);
	const [email, setEmail] = useState(""),
		[name, setName] = useState(""),
		[consent, setConsent] = useState(false),
		[website, setWebsite] = useState("");
	const [done, setDone] = useState(false),
		[token, setToken] = useState("");
	return (
		<section className="mt-8 rounded-xl border-2 border-current/30 p-4">
			<h2 className="text-lg font-bold">{title}</h2>
			{done ? (
				<div className="mt-3 space-y-2">
					<p role="status">Thanks! Your signup request has been saved.</p>
					<button
						type="button"
						className="text-xs underline"
						disabled={undo.isPending}
						onClick={async () => {
							try {
								await undo.mutateAsync({ token });
								setDone(false);
								setConsent(false);
							} catch {
								/* Inline error below. */
							}
						}}
					>
						Undo signup
					</button>
					<p className="text-xs">
						You can also unsubscribe using the link in future emails.
					</p>
					{undo.error && (
						<p role="alert">Could not undo signup. Please try again.</p>
					)}
				</div>
			) : (
				<form
					className="mt-4 space-y-3"
					onSubmit={async (e) => {
						e.preventDefault();
						if (preview) return;
						try {
							const result = await subscribe.mutateAsync({
								profileId,
								email,
								name,
								consent: true,
								restoreToken: token || undefined,
								website,
							});
							setToken(result.token);
							setDone(true);
						} catch {
							/* Inline error below. */
						}
					}}
				>
					<fieldset
						disabled={!ready || subscribe.isPending || preview}
						className="space-y-3"
					>
						<label className="block text-sm">
							Your name (optional)
							<input
								className="mt-1 w-full rounded-lg border border-black/30 bg-white px-3 py-2 text-[#11110F]"
								value={name}
								maxLength={100}
								autoComplete="given-name"
								onChange={(e) => setName(e.target.value)}
							/>
						</label>
						<label className="block text-sm">
							Email address
							<input
								type="email"
								required
								autoComplete="email"
								className="mt-1 w-full rounded-lg border border-black/30 bg-white px-3 py-2 text-[#11110F]"
								value={email}
								maxLength={254}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</label>
						<label className="hidden" aria-hidden="true">
							Website
							<input
								tabIndex={-1}
								autoComplete="off"
								value={website}
								onChange={(e) => setWebsite(e.target.value)}
							/>
						</label>
						<label className="flex items-start gap-2 text-xs leading-relaxed">
							<input
								type="checkbox"
								required
								checked={consent}
								onChange={(e) => setConsent(e.target.checked)}
							/>
							<span>
								I agree to receive email updates from {creator}. I can
								unsubscribe at any time.
							</span>
						</label>
						<button
							type="submit"
							disabled={!consent}
							className="w-full rounded-lg border-2 border-black bg-[#F5FF7B] px-3 py-2 font-bold text-[#11110F]"
						>
							{subscribe.isPending ? "Joining…" : "Join the list"}
						</button>
					</fieldset>
					{subscribe.error && (
						<p role="alert" className="text-sm">
							{subscribe.error.message}
						</p>
					)}
				</form>
			)}
		</section>
	);
}
