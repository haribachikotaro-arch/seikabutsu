import { NextResponse } from "next/server";
import { isClerkConfigured } from "~/lib/auth-config";
import { authFailure } from "~/lib/auth-failure";
import { getPortalAccess } from "~/lib/portal-access";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		if (!isClerkConfigured()) return authFailure();
		const access = await getPortalAccess();
		if (
			!access.authenticated ||
			!access.authorization.allowed ||
			access.authorization.role !== "admin"
		)
			return authFailure();
		return NextResponse.json(
			{ ok: true, role: "admin" },
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch {
		return authFailure();
	}
}
