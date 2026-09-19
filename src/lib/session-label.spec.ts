import { expect, it } from "vitest";
import { sessionLabel } from "./session-label";

it("labels common devices while respecting browser-token precedence", () => {
	expect(sessionLabel("Windows Chrome/1 Safari/1 Edg/1")).toBe(
		"Edge on Windows",
	);
	expect(sessionLabel("iPhone Mac OS Version/1 Safari/1")).toBe(
		"Safari on iOS",
	);
	expect(sessionLabel("Android Linux Chrome/1 Safari/1")).toBe(
		"Chrome on Android",
	);
	expect(sessionLabel(null)).toBe("Browser on unknown device");
});
