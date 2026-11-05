import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { getAuthConfig } from "./auth-config";
import { authorizePortalUser } from "./authorization";
import {
	INVITE_SESSION_COOKIE,
	verifyInviteSessionToken,
} from "./invite-session";

export async function getPortalAccess() {
	const { userId, sessionId } = await auth();
	if (!userId || !sessionId) return { authenticated: false as const };

	const user = await currentUser();
	if (!user) return { authenticated: false as const };

	let authorization = authorizePortalUser(user, getAuthConfig());
	if (authorization.allowed) {
		const cookieStore = await cookies();
		const inviteSessionValid = verifyInviteSessionToken(
			cookieStore.get(INVITE_SESSION_COOKIE)?.value,
			sessionId,
			process.env.CLERK_SECRET_KEY ?? "",
		);
		if (!inviteSessionValid) {
			authorization = { allowed: false, reason: "invite_required" };
		}
	}
	return { authenticated: true as const, userId, user, authorization };
}
