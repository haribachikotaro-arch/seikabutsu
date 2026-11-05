export const allowedRoles = ["admin", "editor"] as const;
export type PortalRole = (typeof allowedRoles)[number];

const list = (value?: string) =>
  (value || "")
    .split(",")
    .map((v) => v.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);

export function getAuthConfig() {
  return {
    domains: list(process.env.ALLOWED_EMAIL_DOMAINS),
    inviteCodeHash: process.env.DATADREAMERS_INVITE_CODE_HASH || "",
  };
}

export function isAuthConfigured() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
  const secretKey = process.env.CLERK_SECRET_KEY || "";
  const publicMode = publishableKey.match(/^pk_(test|live)_/)?.[1];
  const secretMode = secretKey.match(/^sk_(test|live)_/)?.[1];
  return (
    Boolean(publicMode && secretMode && publicMode === secretMode) &&
    !publishableKey.includes("replace_me") &&
    !secretKey.includes("replace_me")
  );
}

export function isInviteCodeConfigured() {
  const hash = process.env.DATADREAMERS_INVITE_CODE_HASH || "";
  const [, salt, key, extra] = hash.split("$");
  return (
    hash.startsWith("scrypt$") &&
    Boolean(salt && key) &&
    !extra &&
    !hash.includes("replace_me") &&
    !hash.includes("\\")
  );
}
