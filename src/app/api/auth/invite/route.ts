import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAuthConfig, isAuthConfigured, isInviteCodeConfigured } from "@/lib/auth-config";
import { authFailure, isSameOrigin } from "@/lib/auth-failure";
import { getClerkSession } from "@/lib/clerk-session";
import {
  createInviteSessionToken,
  INVITE_SESSION_COOKIE,
  INVITE_SESSION_MAX_AGE_SECONDS,
} from "@/lib/invite-session";
import { verifyInviteCode } from "@/lib/invite-code";
import { inviteLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clearInviteCookie(response: NextResponse) {
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

function denied(status = 403, headers?: HeadersInit) {
  return clearInviteCookie(authFailure(status, headers));
}

export async function POST(request: Request) {
  try {
    return await verifyInvitation(request);
  } catch {
    return denied();
  }
}

async function verifyInvitation(request: Request) {
  if (!isSameOrigin(request)) return authFailure();
  if (!isAuthConfigured() || !isInviteCodeConfigured()) return denied(500);

  const session = await getClerkSession(request);
  if (!session) return denied(401);

  const { userId, sessionId, user } = session;
  const rateStatus = inviteLimiter.status(userId);
  if (rateStatus.limited) {
    return denied(429, { "Retry-After": String(rateStatus.retryAfterSeconds) });
  }

  let code: unknown;
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      throw new Error("invalid content type");
    }
    const body = (await request.json()) as { code?: unknown };
    code = body.code;
  } catch {
    inviteLimiter.recordFailure(userId);
    return denied();
  }

  if (typeof code !== "string" || code.trim().length < 8 || code.length > 128) {
    inviteLimiter.recordFailure(userId);
    return denied();
  }

  const config = getAuthConfig();
  const email =
    user.emailAddresses.find((item) => item.id === user.primaryEmailAddressId) ||
    user.emailAddresses[0];
  const address = email?.emailAddress || "";
  const domain = address.toLowerCase().split("@").pop() || "";
  if (!email || email.verification?.status !== "verified" || !config.domains.includes(domain)) {
    inviteLimiter.recordFailure(userId);
    return denied();
  }

  if (!verifyInviteCode(code, config.inviteCodeHash)) {
    inviteLimiter.recordFailure(userId);
    return denied();
  }

  const role =
    user.publicMetadata?.role === "admin" || user.publicMetadata?.role === "editor"
      ? user.publicMetadata.role
      : null;
  if (!role) {
    await (await clerkClient()).users.updateUserMetadata(userId, {
      publicMetadata: { ...user.publicMetadata, role: "editor", inviteVerified: true },
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
    value: createInviteSessionToken(sessionId, process.env.CLERK_SECRET_KEY || ""),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: INVITE_SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
