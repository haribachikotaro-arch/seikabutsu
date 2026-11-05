import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const PREFIX = "scrypt";

function normalizeCode(code: string) {
	return code.trim().normalize("NFKC");
}

export function createInviteCodeHash(code: string, salt?: Buffer) {
	const normalized = normalizeCode(code);
	if (normalized.length < 8) {
		throw new Error("Invite code must contain at least 8 characters.");
	}

	const actualSalt = salt ?? randomBytes(24);
	const derivedKey = scryptSync(normalized, actualSalt, KEY_LENGTH);
	return `${PREFIX}$${actualSalt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export function verifyInviteCode(code: string, encodedHash: string) {
	try {
		const [prefix, saltValue, hashValue, extra] = encodedHash.split("$");
		if (prefix !== PREFIX || !saltValue || !hashValue || extra) return false;

		const expected = Buffer.from(hashValue, "base64url");
		if (expected.length !== KEY_LENGTH) return false;

		const actual = scryptSync(
			normalizeCode(code),
			Buffer.from(saltValue, "base64url"),
			KEY_LENGTH,
		);

		return timingSafeEqual(expected, actual);
	} catch {
		return false;
	}
}
