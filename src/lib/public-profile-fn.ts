import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getPublicProfilePage = createServerFn()
	.validator(z.object({ username: z.string().min(1).max(30) }))
	.handler(async ({ data }) => {
		const { fetchPublicProfileByUsername } = await import(
			"./public-profile.server"
		);
		return fetchPublicProfileByUsername(data.username);
	});
