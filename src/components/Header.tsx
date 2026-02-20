import { Link } from "@tanstack/react-router"
import { authClient } from "#/lib/auth-client"
import { SiteBrand } from "#/components/SiteBrand"

export default function Header() {
	const { data: session, isPending } = authClient.useSession()

	return (
		<header className="bg-[#FFFCEF]/90 backdrop-blur-sm border-b-2 border-black">
			<div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
				<Link to="/">
					<SiteBrand size="md" />
				</Link>

				<nav className="flex items-center gap-4">
					{isPending ? (
						<div className="h-8 w-28 bg-[#F5FF7B] border-2 border-black rounded-lg animate-pulse" />
					) : session?.user ? (
						<Link
							to="/dashboard"
							className="text-sm font-semibold text-[#11110F] hover:underline"
						>
							Dashboard
						</Link>
					) : (
						<>
							<Link
								to="/sign-in"
								className="text-sm font-semibold text-[#4B4B45] hover:text-[#11110F] transition-colors"
							>
								Sign in
							</Link>
							<Link
								to="/sign-up"
								className="text-sm font-semibold border-2 border-black bg-[#11110F] text-[#F5FF7B] px-4 py-2 rounded-lg shadow-[2px_2px_0_0_#11110F] hover:-translate-y-0.5 transition-transform"
							>
								Get started
							</Link>
						</>
					)}
				</nav>
			</div>
		</header>
	)
}
