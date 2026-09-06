import { createTRPCRouter } from "./init";
import { analyticsRouter } from "./routers/analytics";
import { audienceRouter } from "./routers/audience";
import { designRouter } from "./routers/design";
import { domainsRouter } from "./routers/domains";
import { healthRouter } from "./routers/health";
import { linksRouter } from "./routers/links";
import { profileRouter } from "./routers/profile";

export const trpcRouter = createTRPCRouter({
	profile: profileRouter,
	design: designRouter,
	health: healthRouter,
	audience: audienceRouter,
	domains: domainsRouter,
	links: linksRouter,
	analytics: analyticsRouter,
});

export type TRPCRouter = typeof trpcRouter;
