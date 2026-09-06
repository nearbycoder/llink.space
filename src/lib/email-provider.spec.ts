import { afterEach, describe, expect, it, vi } from "vitest";
import {
	removeEmailContact,
	syncEmailContact,
	verifyEmailProvider,
} from "./email-provider";

afterEach(() => vi.unstubAllGlobals());
describe("Brevo contract", () => {
	it("verifies the list, syncs without overriding opt-outs, and removes only from the selected list", async () => {
		const fetch = vi
			.fn()
			.mockImplementation(() =>
				Promise.resolve(new Response(null, { status: 204 })),
			);
		vi.stubGlobal("fetch", fetch);
		await verifyEmailProvider("test-key", 42);
		expect(fetch.mock.calls[0][0]).toBe(
			"https://api.brevo.com/v3/contacts/lists/42",
		);
		await syncEmailContact("test-key", 42, "reader@example.test");
		const options = fetch.mock.calls[1][1];
		expect(options.redirect).toBe("error");
		expect(options.headers["api-key"]).toBe("test-key");
		expect(JSON.parse(options.body)).toEqual({
			email: "reader@example.test",
			listIds: [42],
			updateEnabled: true,
		});
		await removeEmailContact("test-key", 42, "reader@example.test");
		expect(fetch.mock.calls[2][0]).toBe(
			"https://api.brevo.com/v3/contacts/lists/42/contacts/remove",
		);
	});
	it("reports failures without copying response data or secrets", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue(
					new Response("sensitive provider response", { status: 401 }),
				),
		);
		await expect(verifyEmailProvider("secret", 1)).rejects.toThrow(
			"Email provider returned 401",
		);
	});
});
