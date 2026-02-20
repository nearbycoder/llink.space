import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { checkDashboardAccess } from "#/lib/auth-server";
import { SiteBrand } from "#/components/SiteBrand";

export const Route = createFileRoute("/_auth")({
	beforeLoad: async () => {
		const result = await checkDashboardAccess();
		if (result.status !== "unauthenticated") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: AuthLayout,
});

function AuthLayout() {
	return (
		<div className="kinetic-gradient min-h-screen flex items-center justify-center px-4">
			<div className="my-6 w-full max-w-sm kinetic-shell p-6 sm:p-7">
				<div className="text-center mb-8">
					<a href="/" className="inline-block">
						<SiteBrand size="lg" />
					</a>
				</div>
				<Outlet />
			</div>
		</div>
	);
}
