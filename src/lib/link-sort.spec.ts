import { expect, it } from "vitest";
import { sortDashboardView } from "./link-sort";

it("sorts naturally without changing stored page order and resolves ties", () => {
	const links = [
		{ id: "2", title: "Link 10", sortOrder: 0, createdAt: "2026-01-01" },
		{ id: "1", title: "Link 2", sortOrder: 1, createdAt: "2026-01-02" },
	];
	expect(sortDashboardView(links, "az").map((l) => l.id)).toEqual(["1", "2"]);
	expect(sortDashboardView(links, "newest")[0].id).toBe("1");
	expect(sortDashboardView(links, "manual")).toBe(links);
	expect(links[0].sortOrder).toBe(0);
});
