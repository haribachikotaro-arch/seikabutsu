export const PORTAL_ROLES = ["admin", "editor"] as const;
export type PortalRole = (typeof PORTAL_ROLES)[number];

type Environment = {
	ALLOWED_EMAIL_DOMAINS?: string;
	ALLOWED_ROLES?: string;
	NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
	CLERK_SECRET_KEY?: string;
	DATADREAMERS_INVITE_CODE_HASH?: string;
};

function normalizeList(value: string | undefined): string[] {
	return Array.from(
		new Set(
			(value ?? "")
				.split(",")
				.map((item) => item.trim().toLowerCase().replace(/^@/, ""))
				.filter(Boolean),
		),
	);
}

export function getAuthConfig(env: Environment = process.env as Environment) {
	const configuredRoles = normalizeList(env.ALLOWED_ROLES).filter(
		(role): role is PortalRole => PORTAL_ROLES.includes(role as PortalRole),
	);

	return {
		allowedEmailDomains: normalizeList(env.ALLOWED_EMAIL_DOMAINS),
		allowedRoles:
			configuredRoles.length > 0 ? configuredRoles : [...PORTAL_ROLES],
		inviteCodeHash: env.DATADREAMERS_INVITE_CODE_HASH ?? "",
	};
}

export function isClerkConfigured(
	env: Environment = process.env as Environment,
) {
	const publishableKey = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
	const secretKey = env.CLERK_SECRET_KEY ?? "";
	const publicMode = publishableKey.match(/^pk_(test|live)_/)?.[1];
	const secretMode = secretKey.match(/^sk_(test|live)_/)?.[1];

	return (
		/^pk_(test|live)_/.test(publishableKey) &&
		/^sk_(test|live)_/.test(secretKey) &&
		publicMode === secretMode &&
		!publishableKey.includes("replace_me") &&
		!secretKey.includes("replace_me")
	);
}

export function isInviteCodeConfigured(
	env: Environment = process.env as Environment,
) {
	const hash = env.DATADREAMERS_INVITE_CODE_HASH ?? "";
	return hash.startsWith("scrypt$") && !hash.includes("replace_me");
}
