import { createHmac, timingSafeEqual } from "node:crypto";

export const INVITE_SESSION_COOKIE = "dd_invite_session";
export const INVITE_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

function signature(sessionId: string, expiresAt: number, secret: string) {
	return createHmac("sha256", secret)
		.update(`${sessionId}.${expiresAt}`)
		.digest("base64url");
}

export function createInviteSessionToken(
	sessionId: string,
	secret: string,
	now = Date.now(),
) {
	if (!sessionId || !secret)
		throw new Error("Session and secret are required.");
	const expiresAt = Math.floor(now / 1000) + INVITE_SESSION_MAX_AGE_SECONDS;
	return `${expiresAt}.${signature(sessionId, expiresAt, secret)}`;
}

export function verifyInviteSessionToken(
	token: string | undefined,
	sessionId: string,
	secret: string,
	now = Date.now(),
) {
	if (!token || !sessionId || !secret) return false;
	const [expiresValue, suppliedSignature, extra] = token.split(".");
	if (!expiresValue || !suppliedSignature || extra) return false;

	const expiresAt = Number(expiresValue);
	if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) {
		return false;
	}

	const expected = Buffer.from(signature(sessionId, expiresAt, secret));
	const supplied = Buffer.from(suppliedSignature);
	return (
		expected.length === supplied.length && timingSafeEqual(expected, supplied)
	);
}
