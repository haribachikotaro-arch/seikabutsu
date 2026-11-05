import { describe, expect, it } from "vitest";
import {
	authorizePortalUser,
	checkSchoolIdentity,
	type PortalUser,
} from "./authorization";

const config = {
	allowedEmailDomains: ["school.example.jp"],
	allowedRoles: ["admin", "editor"] as const,
};

function user(overrides: Partial<PortalUser> = {}): PortalUser {
	return {
		primaryEmailAddressId: "email_1",
		emailAddresses: [
			{
				id: "email_1",
				emailAddress: "member@school.example.jp",
				verification: { status: "verified" },
			},
		],
		publicMetadata: { role: "editor", inviteVerified: true },
		...overrides,
	};
}

describe("school identity", () => {
	it("accepts a verified primary school email", () => {
		expect(checkSchoolIdentity(user(), config.allowedEmailDomains)).toEqual({
			valid: true,
			email: "member@school.example.jp",
		});
	});

	it("rejects unverified email addresses", () => {
		expect(
			checkSchoolIdentity(
				user({
					emailAddresses: [
						{
							id: "email_1",
							emailAddress: "member@school.example.jp",
							verification: { status: "unverified" },
						},
					],
				}),
				config.allowedEmailDomains,
			),
		).toEqual({ valid: false, reason: "email_unverified" });
	});

	it("rejects lookalike domains", () => {
		expect(
			checkSchoolIdentity(
				user({
					emailAddresses: [
						{
							id: "email_1",
							emailAddress: "member@evil-school.example.jp",
							verification: { status: "verified" },
						},
					],
				}),
				config.allowedEmailDomains,
			),
		).toEqual({ valid: false, reason: "domain" });
	});
});

describe("portal authorization", () => {
	it.each(["admin", "editor"] as const)("recognizes the %s role", (role) => {
		expect(
			authorizePortalUser(user({ publicMetadata: { role } }), {
				allowedEmailDomains: config.allowedEmailDomains,
				allowedRoles: [...config.allowedRoles],
			}),
		).toMatchObject({ allowed: true, role });
	});

	it("sends users without a role to invite verification", () => {
		expect(
			authorizePortalUser(user({ publicMetadata: {} }), {
				allowedEmailDomains: config.allowedEmailDomains,
				allowedRoles: [...config.allowedRoles],
			}),
		).toEqual({ allowed: false, reason: "invite_required" });
	});

	it("rejects unknown role values", () => {
		expect(
			authorizePortalUser(user({ publicMetadata: { role: "owner" } }), {
				allowedEmailDomains: config.allowedEmailDomains,
				allowedRoles: [...config.allowedRoles],
			}),
		).toEqual({ allowed: false, reason: "role" });
	});
});
