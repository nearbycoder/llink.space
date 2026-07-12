import { createTRPCRouter } from "./init";
import { analyticsRouter } from "./routers/analytics";
import { linksRouter } from "./routers/links";
import { profileRouter } from "./routers/profile";

export const trpcRouter = createTRPCRouter({
	profile: profileRouter,
	links: linksRouter,
	analytics: analyticsRouter,
});

export type TRPCRouter = typeof trpcRouter;
