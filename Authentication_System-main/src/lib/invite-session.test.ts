import { describe, expect, it } from "vitest";
import {
	createInviteSessionToken,
	INVITE_SESSION_MAX_AGE_SECONDS,
	verifyInviteSessionToken,
} from "./invite-session";

describe("invite session token", () => {
	const now = Date.UTC(2026, 8, 9);
	const secret = "sk_test_example_secret";

	it("accepts a token for the same Clerk session", () => {
		const token = createInviteSessionToken("sess_123", secret, now);
		expect(verifyInviteSessionToken(token, "sess_123", secret, now)).toBe(true);
	});

	it("rejects a token copied to another Clerk session", () => {
		const token = createInviteSessionToken("sess_123", secret, now);
		expect(verifyInviteSessionToken(token, "sess_other", secret, now)).toBe(
			false,
		);
	});

	it("rejects expired and modified tokens", () => {
		const token = createInviteSessionToken("sess_123", secret, now);
		const expiredAt = now + (INVITE_SESSION_MAX_AGE_SECONDS + 1) * 1000;
		expect(verifyInviteSessionToken(token, "sess_123", secret, expiredAt)).toBe(
			false,
		);
		expect(verifyInviteSessionToken(`${token}x`, "sess_123", secret, now)).toBe(
			false,
		);
	});
});
