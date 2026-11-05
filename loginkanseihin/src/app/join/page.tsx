import { auth, currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthPageShell from "~/components/auth/AuthPageShell";
import ConfigurationRequired from "~/components/auth/ConfigurationRequired";
import InviteForm from "~/components/auth/InviteForm";
import {
	getAuthConfig,
	isClerkConfigured,
	isInviteCodeConfigured,
} from "~/lib/auth-config";
import { checkSchoolIdentity, readPortalRole } from "~/lib/authorization";
import {
	INVITE_SESSION_COOKIE,
	verifyInviteSessionToken,
} from "~/lib/invite-session";

export const metadata: Metadata = { title: "招待コード確認" };
export const dynamic = "force-dynamic";

export default async function JoinPage() {
	if (!isClerkConfigured()) {
		return (
			<AuthPageShell
				eyebrow="MEMBER VERIFICATION"
				title="初期設定が必要です。"
				description="Clerkと招待コードを設定するとメンバー確認を開始できます。"
			>
				<ConfigurationRequired />
			</AuthPageShell>
		);
	}

	const { userId, sessionId } = await auth();
	if (!userId || !sessionId) redirect("/sign-in?redirect_url=/join");

	const user = await currentUser();
	if (!user) redirect("/access-denied");

	const identity = checkSchoolIdentity(
		user,
		getAuthConfig().allowedEmailDomains,
	);
	if (!identity.valid) redirect("/access-denied");
	const cookieStore = await cookies();
	const inviteSessionValid = verifyInviteSessionToken(
		cookieStore.get(INVITE_SESSION_COOKIE)?.value,
		sessionId,
		process.env.CLERK_SECRET_KEY ?? "",
	);
	if (readPortalRole(user.publicMetadata) && inviteSessionValid) {
		redirect("/portal");
	}

	return (
		<AuthPageShell
			eyebrow="MEMBER VERIFICATION"
			title="秘密の暗号を確認します。"
			description={`${identity.email} の本人確認が完了しました。次にData Dreamersから共有された招待コードを入力してください。`}
		>
			{isInviteCodeConfigured() ? (
				<InviteForm />
			) : (
				<ConfigurationRequired inviteOnly />
			)}
		</AuthPageShell>
	);
}
