import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
	getAuthConfig,
	isClerkConfigured,
	isInviteCodeConfigured,
} from "~/lib/auth-config";
import { checkSchoolIdentity, readPortalRole } from "~/lib/authorization";
import { authFailure, isSameOrigin } from "~/lib/auth-failure";
import { verifyInviteCode } from "~/lib/invite-code";
import {
	createInviteSessionToken,
	INVITE_SESSION_COOKIE,
	INVITE_SESSION_MAX_AGE_SECONDS,
} from "~/lib/invite-session";
import { inviteLimiter } from "~/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function denied(status = 403, headers?: HeadersInit) {
	const response = authFailure(status, headers);
	response.cookies.set({
		name: INVITE_SESSION_COOKIE,
		value: "",
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: 0,
	});
	return response;
}

export async function POST(request: Request) {
	try {
		return await verifyInvitation(request);
	} catch {
		// Never let Clerk errors or internal exceptions escape the API boundary.
		return denied();
	}
}

async function verifyInvitation(request: Request) {
	if (!isSameOrigin(request)) {
		// Cross-origin requests must not modify even the caller's auth cookies.
		return authFailure();
	}
	if (!isClerkConfigured() || !isInviteCodeConfigured()) return denied();

	const { userId, sessionId } = await auth();
	if (!userId || !sessionId) return denied();

	const rateStatus = inviteLimiter.status(userId);
	if (rateStatus.limited) {
		return denied(429, {
			"Retry-After": String(rateStatus.retryAfterSeconds),
		});
	}

	let code: unknown;
	try {
		if (!request.headers.get("content-type")?.startsWith("application/json"))
			throw new Error("invalid content type");
		const body = (await request.json()) as { code?: unknown };
		code = body.code;
	} catch {
		inviteLimiter.recordFailure(userId);
		return denied();
	}

	if (typeof code !== "string" || code.length < 8 || code.length > 128) {
		inviteLimiter.recordFailure(userId);
		return denied();
	}

	const user = await currentUser();
	if (!user) return denied();

	const config = getAuthConfig();
	const identity = checkSchoolIdentity(user, config.allowedEmailDomains);
	if (!identity.valid) {
		inviteLimiter.recordFailure(userId);
		return denied();
	}

	const existingRole = readPortalRole(user.publicMetadata);
	if (
		!existingRole &&
		user.publicMetadata.role !== undefined &&
		user.publicMetadata.role !== null
	) {
		inviteLimiter.recordFailure(userId);
		return denied();
	}

	if (!verifyInviteCode(code, config.inviteCodeHash)) {
		inviteLimiter.recordFailure(userId);
		return denied();
	}

	if (!existingRole) {
		const client = await clerkClient();
		await client.users.updateUserMetadata(userId, {
			publicMetadata: { role: "editor", inviteVerified: true },
			privateMetadata: { inviteVerifiedAt: new Date().toISOString() },
		});
	}
	inviteLimiter.clear(userId);
	const response = NextResponse.json(
		{ ok: true },
		{ headers: { "Cache-Control": "no-store" } },
	);
	response.cookies.set({
		name: INVITE_SESSION_COOKIE,
		value: createInviteSessionToken(
			sessionId,
			process.env.CLERK_SECRET_KEY ?? "",
		),
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: INVITE_SESSION_MAX_AGE_SECONDS,
	});
	return response;
}
