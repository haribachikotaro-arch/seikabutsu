import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	isClerkConfigured: vi.fn(),
	getPortalAccess: vi.fn(),
}));
vi.mock("~/lib/auth-config", () => ({ isClerkConfigured: mocks.isClerkConfigured }));
vi.mock("~/lib/portal-access", () => ({ getPortalAccess: mocks.getPortalAccess }));
import { GET as checkAccess } from "./route";
import { GET as checkAdmin } from "../../admin/status/route";

beforeEach(() => {
	vi.resetAllMocks();
	mocks.isClerkConfigured.mockReturnValue(true);
});

describe.each([checkAccess, checkAdmin])("protected API rejection", (get) => {
	it.each(["configuration", "email_missing", "email_unverified", "domain", "role", "invite_required"])(
		"hides the rejection reason: %s", async (reason) => {
			mocks.getPortalAccess.mockResolvedValue({ authenticated: true, authorization: { allowed: false, reason } });
			const response = await get();
			expect(response.status).toBe(403);
			expect(await response.json()).toEqual({ ok: false, error: "authentication_failed" });
			expect(response.headers.get("cache-control")).toBe("no-store");
		},
	);
	it("does not distinguish missing authentication", async () => {
		mocks.getPortalAccess.mockResolvedValue({ authenticated: false });
		const response = await get();
		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ ok: false, error: "authentication_failed" });
	});
	it("sanitizes internal exceptions", async () => {
		mocks.getPortalAccess.mockRejectedValue(new Error("private detail"));
		expect(await (await get()).json()).toEqual({ ok: false, error: "authentication_failed" });
	});
	it("does not disclose missing configuration", async () => {
		mocks.isClerkConfigured.mockReturnValue(false);
		expect(await (await get()).json()).toEqual({ ok: false, error: "authentication_failed" });
		expect(mocks.getPortalAccess).not.toHaveBeenCalled();
	});
});

describe("successful authorization", () => {
	it.each(["editor", "admin"])("permits the portal role: %s", async (role) => {
		mocks.getPortalAccess.mockResolvedValue({ authenticated: true, userId: "test-user", authorization: { allowed: true, email: "test@school.example", role } });
		const response = await checkAccess();
		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("no-store");
	});
	it("denies editor access to admin routes", async () => {
		mocks.getPortalAccess.mockResolvedValue({ authenticated: true, authorization: { allowed: true, role: "editor" } });
		const response = await checkAdmin();
		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ ok: false, error: "authentication_failed" });
	});
	it("allows only the authorized admin", async () => {
		mocks.getPortalAccess.mockResolvedValue({ authenticated: true, authorization: { allowed: true, role: "admin" } });
		const response = await checkAdmin();
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true, role: "admin" });
	});
});
