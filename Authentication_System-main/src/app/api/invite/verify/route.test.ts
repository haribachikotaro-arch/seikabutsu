import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INVITE_SESSION_COOKIE, verifyInviteSessionToken } from "~/lib/invite-session";

const mocks = vi.hoisted(() => ({
	auth: vi.fn(),
	currentUser: vi.fn(),
	clerkClient: vi.fn(),
	updateUserMetadata: vi.fn(),
	isClerkConfigured: vi.fn(),
	isInviteCodeConfigured: vi.fn(),
	getAuthConfig: vi.fn(),
	verifyInviteCode: vi.fn(),
	status: vi.fn(),
	recordFailure: vi.fn(),
	clear: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({
	auth: mocks.auth, currentUser: mocks.currentUser, clerkClient: mocks.clerkClient,
}));
vi.mock("~/lib/auth-config", () => ({
	isClerkConfigured: mocks.isClerkConfigured,
	isInviteCodeConfigured: mocks.isInviteCodeConfigured,
	getAuthConfig: mocks.getAuthConfig,
}));
vi.mock("~/lib/invite-code", () => ({ verifyInviteCode: mocks.verifyInviteCode }));
vi.mock("~/lib/rate-limit", () => ({ inviteLimiter: {
	status: mocks.status, recordFailure: mocks.recordFailure, clear: mocks.clear,
} }));
import { POST } from "./route";

function user(role: unknown = "editor", verified = true) {
	return {
		primaryEmailAddressId: "email-test",
		emailAddresses: [{ id: "email-test", emailAddress: "test@school.example",
			verification: { status: verified ? "verified" : "unverified" } }],
		publicMetadata: role === undefined ? {} : { role },
	};
}
function request(body = JSON.stringify({ code: "example-test-code" }), origin = "http://localhost:3100") {
	return new Request("http://localhost:3100/api/invite/verify", {
		method: "POST", headers: { "content-type": "application/json", origin }, body,
	});
}
async function expectDenied(response: Response, clearsCookie = true) {
	expect(response.status).toBe(403);
	expect(await response.json()).toEqual({ ok: false, error: "authentication_failed" });
	expect(response.headers.get("cache-control")).toBe("no-store");
	if (clearsCookie) {
		expect(response.headers.get("set-cookie")).toContain(`${INVITE_SESSION_COOKIE}=`);
		expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
	} else {
		expect(response.headers.get("set-cookie")).toBeNull();
	}
	expect(mocks.updateUserMetadata).not.toHaveBeenCalled();
}

beforeEach(() => {
	vi.resetAllMocks();
	vi.stubEnv("CLERK_SECRET_KEY", "unit-test-only-not-a-real-key");
	mocks.isClerkConfigured.mockReturnValue(true);
	mocks.isInviteCodeConfigured.mockReturnValue(true);
	mocks.auth.mockResolvedValue({ userId: "user-test", sessionId: "session-test" });
	mocks.currentUser.mockResolvedValue(user());
	mocks.clerkClient.mockResolvedValue({ users: { updateUserMetadata: mocks.updateUserMetadata } });
	mocks.getAuthConfig.mockReturnValue({ allowedEmailDomains: ["school.example"], inviteCodeHash: "test-only" });
	mocks.status.mockReturnValue({ limited: false, retryAfterSeconds: 0 });
	mocks.verifyInviteCode.mockReturnValue(true);
});
afterEach(() => vi.unstubAllEnvs());

describe("invite verification does not disclose rejection reasons", () => {
	it("rejects missing authentication", async () => {
		mocks.auth.mockResolvedValue({ userId: null, sessionId: null });
		await expectDenied(await POST(request()));
	});
	it("rejects wrong invite codes without issuing a token", async () => {
		mocks.verifyInviteCode.mockReturnValue(false);
		await expectDenied(await POST(request()));
		expect(mocks.recordFailure).toHaveBeenCalledWith("user-test");
	});
	it.each(["bad-role", "owner", "superadmin"])("does not upgrade invalid roles: %s", async (role) => {
		mocks.currentUser.mockResolvedValue(user(role));
		await expectDenied(await POST(request()));
	});
	it("rejects unverified email", async () => {
		mocks.currentUser.mockResolvedValue(user("editor", false));
		await expectDenied(await POST(request()));
	});
	it("rejects disallowed domains", async () => {
		mocks.getAuthConfig.mockReturnValue({ allowedEmailDomains: ["other.example"] });
		await expectDenied(await POST(request()));
	});
	it("rejects expired sessions", async () => {
		mocks.currentUser.mockResolvedValue(null);
		await expectDenied(await POST(request()));
	});
	it.each(["{}", "null", "{invalid", JSON.stringify({ code: "short" }), JSON.stringify({ code: 123 })])("rejects malformed inputs: %s", async (body) => {
		await expectDenied(await POST(request(body)));
	});
	it.each(["null", "invalid-origin", "http://evil.example", "https://localhost:3100"])("rejects invalid origins: %s", async (origin) => {
		await expectDenied(await POST(request(undefined, origin)), false);
		expect(mocks.auth).not.toHaveBeenCalled();
	});
	it.each(["isClerkConfigured", "isInviteCodeConfigured"] as const)("does not disclose configuration: %s", async (setting) => {
		mocks[setting].mockReturnValue(false);
		await expectDenied(await POST(request()));
	});
	it("sanitizes thrown provider errors", async () => {
		mocks.auth.mockRejectedValue(new Error("private key and account details"));
		await expectDenied(await POST(request()));
	});
	it("preserves throttling without exposing factor results", async () => {
		mocks.status.mockReturnValue({ limited: true, retryAfterSeconds: 42 });
		const response = await POST(request());
		expect(response.status).toBe(429);
		expect(await response.json()).toEqual({ ok: false, error: "authentication_failed" });
		expect(response.headers.get("retry-after")).toBe("42");
		expect(mocks.verifyInviteCode).not.toHaveBeenCalled();
	});
	it.each(["editor", "admin"])("issues a session-bound token only after validation: %s", async (role) => {
		mocks.currentUser.mockResolvedValue(user(role));
		const response = await POST(request());
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		const token = response.cookies.get(INVITE_SESSION_COOKIE)?.value;
		expect(verifyInviteSessionToken(token, "session-test", "unit-test-only-not-a-real-key")).toBe(true);
		expect(verifyInviteSessionToken(token, "another-session", "unit-test-only-not-a-real-key")).toBe(false);
		expect(response.headers.get("set-cookie")).toContain("HttpOnly");
		expect(mocks.updateUserMetadata).not.toHaveBeenCalled();
	});
	it("assigns only editor to newly verified members", async () => {
		mocks.currentUser.mockResolvedValue({ ...user(), publicMetadata: {} });
		const response = await POST(request());
		expect(response.status).toBe(200);
		expect(mocks.updateUserMetadata).toHaveBeenCalledWith("user-test", {
			publicMetadata: { role: "editor", inviteVerified: true },
			privateMetadata: { inviteVerifiedAt: expect.any(String) },
		});
	});
});
