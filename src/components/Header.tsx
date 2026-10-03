import { Link } from "@tanstack/react-router";
import { SiteBrand } from "#/components/SiteBrand";
import { authClient } from "#/lib/auth-client";

export default function Header() {
	const { data: session, isPending } = authClient.useSession();

	return (
		<header className="bg-card/90 backdrop-blur-sm border-b border-border">
			<div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
				<Link to="/">
					<SiteBrand size="md" />
				</Link>

				<nav className="flex items-center gap-4">
					{isPending ? (
						<div className="h-8 w-28 bg-muted border border-border rounded-lg animate-pulse" />
					) : session?.user ? (
						<Link
							to="/dashboard"
							className="text-sm font-semibold text-foreground hover:underline"
						>
							Dashboard
						</Link>
					) : (
						<>
							<Link
								to="/sign-in"
								className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
							>
								Sign in
							</Link>
							<Link
								to="/sign-up"
								className="text-sm font-semibold border border-border bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-sm hover:brightness-95 transition-transform"
							>
								Get started
							</Link>
						</>
					)}
				</nav>
			</div>
		</header>
	);
}
