import type { Metadata } from "next";
import AuthPageShell from "~/components/auth/AuthPageShell";
import ConfigurationRequired from "~/components/auth/ConfigurationRequired";
import EmailPasswordSignUp from "~/components/auth/EmailPasswordSignUp";
import { getAuthConfig, isClerkConfigured } from "~/lib/auth-config";

export const metadata: Metadata = { title: "アカウント作成" };

export default function SignUpPage() {
	const clerkConfigured = isClerkConfigured();

	const domains = getAuthConfig().allowedEmailDomains;
	const description = domains.length
		? `学校メール（${domains.map((domain) => `@${domain}`).join(" / ")}）で本人確認を行います。登録後にData Dreamersの招待コードが必要です。`
		: "学校メールで本人確認を行います。登録後にData Dreamersの招待コードが必要です。";

	return (
		<AuthPageShell
			eyebrow="CREATE ACCOUNT"
			title="メンバー登録をはじめる。"
			description={description}
		>
			{clerkConfigured && domains.length > 0 ? (
				<EmailPasswordSignUp allowedDomains={domains} />
			) : (
				<ConfigurationRequired />
			)}
		</AuthPageShell>
	);
}
