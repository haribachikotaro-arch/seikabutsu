import { describe, expect, it } from "vitest";
import { createInviteCodeHash, verifyInviteCode } from "./invite-code";

describe("invite code hashing", () => {
	const hash = createInviteCodeHash(
		"DataDreamers-2026",
		Buffer.from("fixed-test-salt-value-123"),
	);

	it("accepts the matching invite code", () => {
		expect(verifyInviteCode("DataDreamers-2026", hash)).toBe(true);
	});

	it("rejects an incorrect invite code", () => {
		expect(verifyInviteCode("DataDreamers-2027", hash)).toBe(false);
	});

	it("rejects malformed hashes without throwing", () => {
		expect(verifyInviteCode("DataDreamers-2026", "not-a-hash")).toBe(false);
	});

	it("requires a non-trivial invite code", () => {
		expect(() => createInviteCodeHash("short")).toThrow();
	});
});
