import { describe, expect, it } from "vitest";
import {
	getAuthConfig,
	isClerkConfigured,
	isInviteCodeConfigured,
} from "./auth-config";

describe("auth configuration", () => {
	it("normalizes domain and role lists", () => {
		expect(
			getAuthConfig({
				ALLOWED_EMAIL_DOMAINS: "@School.Example.jp, school.example.jp",
				ALLOWED_ROLES: "Admin,editor,unknown",
			}),
		).toMatchObject({
			allowedEmailDomains: ["school.example.jp"],
			allowedRoles: ["admin", "editor"],
		});
	});

	it("rejects Clerk placeholders", () => {
		expect(
			isClerkConfigured({
				NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_replace_me",
				CLERK_SECRET_KEY: "sk_test_replace_me",
			}),
		).toBe(false);
	});

	it("recognizes configured invite hashes", () => {
		expect(
			isInviteCodeConfigured({
				DATADREAMERS_INVITE_CODE_HASH: "scrypt$salt$hash",
			}),
		).toBe(true);
		expect(
			isInviteCodeConfigured({
				DATADREAMERS_INVITE_CODE_HASH: "scrypt$replace_me",
			}),
		).toBe(false);
	});

	it("rejects mixed development and production keys", () => {
		for (const [publicMode, secretMode] of [
			["test", "live"],
			["live", "test"],
		]) {
			expect(
				isClerkConfigured({
					NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: `pk_${publicMode}_configured`,
					CLERK_SECRET_KEY: `sk_${secretMode}_configured`,
				}),
			).toBe(false);
		}
	});

	it("accepts matching Clerk key environments", () => {
		for (const mode of ["test", "live"]) {
			expect(
				isClerkConfigured({
					NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: `pk_${mode}_configured`,
					CLERK_SECRET_KEY: `sk_${mode}_configured`,
				}),
			).toBe(true);
		}
	});
});
