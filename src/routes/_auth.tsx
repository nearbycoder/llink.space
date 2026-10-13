import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AuthFrame } from "#/components/AuthFrame";
import { checkDashboardAccess } from "#/lib/auth-server";

export const Route = createFileRoute("/_auth")({
	beforeLoad: async () => {
		const result = await checkDashboardAccess();
		if (result.status !== "unauthenticated") {
			throw redirect({ to: "/dashboard" });
		}
	},
	head: () => ({
		meta: [{ name: "robots", content: "noindex, nofollow, noarchive" }],
	}),
	component: AuthLayout,
});

function AuthLayout() {
	return (
		<AuthFrame>
			<Outlet />
		</AuthFrame>
	);
}
