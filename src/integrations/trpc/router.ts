import { createTRPCRouter } from "./init";
import { profileRouter } from "./routers/profile";
import { linksRouter } from "./routers/links";
import { analyticsRouter } from "./routers/analytics";

export const trpcRouter = createTRPCRouter({
	profile: profileRouter,
	links: linksRouter,
	analytics: analyticsRouter,
});

export type TRPCRouter = typeof trpcRouter;
