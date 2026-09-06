import { createTRPCRouter } from "./init";
import { analyticsRouter } from "./routers/analytics";
import { designRouter } from "./routers/design";
import { healthRouter } from "./routers/health";
import { linksRouter } from "./routers/links";
import { profileRouter } from "./routers/profile";

export const trpcRouter = createTRPCRouter({
	profile: profileRouter,
	design: designRouter,
	health: healthRouter,
	links: linksRouter,
	analytics: analyticsRouter,
});

export type TRPCRouter = typeof trpcRouter;
