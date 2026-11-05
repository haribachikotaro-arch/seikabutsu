import { describe, expect, it } from "vitest";
import { authFailure, isSameOrigin } from "./auth-failure";

describe("public failure response", () => {
	it("contains no reason or private details and cannot be cached", async () => {
		const response = authFailure();
		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({
			ok: false,
			error: "authentication_failed",
		});
		expect(response.headers.get("cache-control")).toBe("no-store");
	});
});

describe("same-origin protection", () => {
	it("allows the exact origin", () => {
		expect(isSameOrigin(new Request("http://localhost:3100/api/invite/verify", {
			headers: { origin: "http://localhost:3100" },
		}))).toBe(true);
	});
	it.each([undefined, "null", "not-a-url", "http://evil.example", "http://localhost:3200", "https://localhost:3100", "http://localhost:3100/", "http://localhost:3100.evil.example"])(
		"rejects missing, malformed or cross-origin requests: %s",
		(origin) => {
			const request = new Request("http://localhost:3100/api/invite/verify", {
				headers: origin === undefined ? {} : { origin },
			});
			expect(isSameOrigin(request)).toBe(false);
		},
	);
});
