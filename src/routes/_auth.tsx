import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_auth")({
	component: AuthLayout,
})

function AuthLayout() {
	return (
		<div className="kinetic-gradient min-h-screen flex items-center justify-center px-4">
			<div className="my-6 w-full max-w-sm kinetic-shell p-6 sm:p-7">
				<div className="text-center mb-8">
					<a href="/" className="inline-block">
						<span
							className="text-2xl tracking-tight"
							style={{ fontFamily: "'Archivo Black', sans-serif" }}
						>
							llink.space
						</span>
					</a>
				</div>
				<Outlet />
			</div>
		</div>
	)
}
