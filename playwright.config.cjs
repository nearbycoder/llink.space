const { defineConfig, devices } = require("@playwright/test");

const port = Number(process.env.PLAYWRIGHT_PORT || 3000);
const baseURL = `http://127.0.0.1:${port}`;
const databaseUrl =
	process.env.DATABASE_URL ||
	"postgres://postgres:postgres@127.0.0.1:5432/llink_test";
const authSecret =
	process.env.BETTER_AUTH_SECRET ||
	"playwright-only-secret-at-least-thirty-two-characters";

module.exports = defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI
		? [["github"], ["html", { open: "never" }]]
		: "list",
	use: {
		baseURL,
		trace: "on-first-retry",
	},
	webServer: {
		command: `DATABASE_URL=${databaseUrl} BETTER_AUTH_SECRET=${authSecret} BETTER_AUTH_URL=${baseURL} APP_URL=${baseURL} TANSTACK_DEVTOOLS_PORT=${port + 39000} ./node_modules/.bin/vite dev --host 127.0.0.1 --port ${port}`,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
});
