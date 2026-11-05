import type { PortalRole } from "./auth-config";

export type PortalUser = {
	primaryEmailAddressId?: string | null;
	emailAddresses: Array<{
		id: string;
		emailAddress: string;
		verification?: { status?: string | null } | null;
	}>;
	publicMetadata?: Record<string, unknown> | null;
};

export type IdentityFailure =
	| "configuration"
	| "email_missing"
	| "email_unverified"
	| "domain";

export type IdentityResult =
	| { valid: true; email: string }
	| { valid: false; reason: IdentityFailure };

export type AuthorizationResult =
	| { allowed: true; email: string; role: PortalRole }
	| { allowed: false; reason: IdentityFailure | "invite_required" | "role" };

function emailDomain(email: string) {
	const separator = email.lastIndexOf("@");
	if (separator <= 0 || separator === email.length - 1) return null;
	return email.slice(separator + 1).toLowerCase();
}

export function checkSchoolIdentity(
	user: PortalUser,
	allowedEmailDomains: string[],
): IdentityResult {
	if (allowedEmailDomains.length === 0) {
		return { valid: false, reason: "configuration" };
	}

	const primaryEmail = user.primaryEmailAddressId
		? user.emailAddresses.find(
				(email) => email.id === user.primaryEmailAddressId,
			)
		: user.emailAddresses[0];

	if (!primaryEmail) return { valid: false, reason: "email_missing" };
	if (primaryEmail.verification?.status !== "verified") {
		return { valid: false, reason: "email_unverified" };
	}

	const domain = emailDomain(primaryEmail.emailAddress);
	if (!domain || !allowedEmailDomains.includes(domain)) {
		return { valid: false, reason: "domain" };
	}

	return { valid: true, email: primaryEmail.emailAddress };
}

export function readPortalRole(
	metadata: Record<string, unknown> | null | undefined,
): PortalRole | null {
	const role =
		typeof metadata?.role === "string" ? metadata.role.toLowerCase() : "";
	if (role === "admin" || role === "editor") return role;
	return null;
}

export function authorizePortalUser(
	user: PortalUser,
	config: { allowedEmailDomains: string[]; allowedRoles: PortalRole[] },
): AuthorizationResult {
	const identity = checkSchoolIdentity(user, config.allowedEmailDomains);
	if (!identity.valid) return { allowed: false, reason: identity.reason };

	const rawRole = user.publicMetadata?.role;
	const role = readPortalRole(user.publicMetadata);
	if (!role) {
		return {
			allowed: false,
			reason:
				rawRole === undefined || rawRole === null ? "invite_required" : "role",
		};
	}

	if (!config.allowedRoles.includes(role)) {
		return { allowed: false, reason: "role" };
	}

	return { allowed: true, email: identity.email, role };
}
