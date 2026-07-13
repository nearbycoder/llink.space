import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	AnalyticsLoadingState,
	DashboardPendingShellContent,
	LinksLoadingState,
	ProfileLoadingState,
} from "./DashboardLoading";

describe("dashboard loading states", () => {
	it.each([
		[LinksLoadingState, "Loading your links", "Featured"],
		[ProfileLoadingState, "Loading your profile", "Display name"],
		[AnalyticsLoadingState, "Loading your analytics", "Total clicks"],
	] as const)("renders an accessible, content-shaped %s state", (Component, accessibleLabel, visibleContext) => {
		const markup = renderToStaticMarkup(createElement(Component));

		expect(markup).toContain('role="status"');
		expect(markup).toContain('aria-busy="true"');
		expect(markup).toContain(accessibleLabel);
		expect(markup).toContain(visibleContext);
	});

	it("keeps dashboard navigation visible while the authenticated route loads", () => {
		const markup = renderToStaticMarkup(
			createElement(DashboardPendingShellContent, { pathname: "/dashboard" }),
		);

		expect(markup).toContain("llink.space");
		expect(markup).toContain("Links");
		expect(markup).toContain("Profile");
		expect(markup).toContain("Analytics");
		expect(markup).toContain("Loading your links");
	});

	it.each([
		["/dashboard/profile", "Loading your profile"],
		["/dashboard/analytics", "Loading your analytics"],
	] as const)("matches the pending content to %s", (pathname, loadingLabel) => {
		const markup = renderToStaticMarkup(
			createElement(DashboardPendingShellContent, { pathname }),
		);

		expect(markup).toContain(loadingLabel);
	});
});
