import type { Metadata } from "next";
import AuthPageShell from "~/components/auth/AuthPageShell";
import ConfigurationRequired from "~/components/auth/ConfigurationRequired";
import EmailPasswordSignIn from "~/components/auth/EmailPasswordSignIn";
import { isClerkConfigured, isInviteCodeConfigured } from "~/lib/auth-config";

export const metadata: Metadata = { title: "ログイン" };

export default function SignInPage() {
	return (
		<AuthPageShell
			eyebrow="MEMBER SIGN IN"
			title="活動の続きを、ここから。"
			description="登録済みの学校メール、自分で設定したパスワード、Data Dreamersの秘密の暗号を入力してください。"
		>
			{isClerkConfigured() && isInviteCodeConfigured() ? (
				<EmailPasswordSignIn />
			) : (
				<ConfigurationRequired inviteOnly={isClerkConfigured()} />
			)}
		</AuthPageShell>
	);
}
