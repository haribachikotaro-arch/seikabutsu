import { clerkClient, verifyToken } from "@clerk/nextjs/server";
import type { User } from "@clerk/backend";

export type ClerkSession = {
  userId: string;
  sessionId: string;
  user: User;
};

/**
 * Verify the Clerk session token sent by the browser and load the matching
 * Clerk user. Keeping this in a route helper avoids making the Next proxy
 * call itself while an API route is being rendered.
 */
export async function getClerkSession(request: Request): Promise<ClerkSession | null> {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return null;

  try {
    const requestOrigin = new URL(request.url).origin;
    const siteOrigin = process.env.SITE_ORIGIN || requestOrigin;
    const authorizedParties = [...new Set([siteOrigin, requestOrigin])];
    const client = await clerkClient();

    let userId = "";
    let sessionId = "";
    if (token) {
      const verified = await verifyToken(token, {
        secretKey,
        authorizedParties,
        ...(process.env.CLERK_JWT_KEY ? { jwtKey: process.env.CLERK_JWT_KEY } : {}),
      });
      const claims = verified.data as { sub?: unknown; sid?: unknown } | undefined;
      userId = typeof claims?.sub === "string" ? claims.sub : "";
      sessionId = typeof claims?.sid === "string" ? claims.sid : "";
      if (!userId || !sessionId || (Array.isArray(verified.errors) && verified.errors.length > 0)) return null;
    } else {
      // Keep the same cookie based flow as loginkanseihin. This also lets the
      // route work while Clerk is publishing the session cookie after finalize.
      const state = await client.authenticateRequest(request, {
        secretKey,
        publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        authorizedParties,
        ...(process.env.CLERK_JWT_KEY ? { jwtKey: process.env.CLERK_JWT_KEY } : {}),
      });
      if (!state.isAuthenticated || !state.token) return null;
      const auth = state.toAuth();
      userId = auth.userId || "";
      sessionId = auth.sessionId || "";
      if (!userId || !sessionId) return null;
    }

    const user = await client.users.getUser(userId);
    return { userId, sessionId, user };
  } catch {
    return null;
  }
}
