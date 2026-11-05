import {
	IconCheck,
	IconKey,
	IconMailCheck,
	IconSettings,
} from "@tabler/icons-react";
import { Box, Flex, Heading, Text } from "@yamada-ui/react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Section from "~/components/layout/Section";
import {
	getAuthConfig,
	isClerkConfigured,
	isInviteCodeConfigured,
} from "~/lib/auth-config";
import { getPortalAccess } from "~/lib/portal-access";

export const metadata: Metadata = { title: "認証セットアップ" };

const Step = ({
	number,
	title,
	children,
}: {
	number: string;
	title: string;
	children: React.ReactNode;
}) => (
	<Flex
		borderTop="1px solid"
		borderColor="gray.200"
		py="7"
		gap="6"
		align="start"
	>
		<Text color="banner" fontWeight="bold" fontSize="sm">
			{number}
		</Text>
		<Box>
			<Heading as="h2" size="md">
				{title}
			</Heading>
			<Box color="gray.700" mt="3">
				{children}
			</Box>
		</Box>
	</Flex>
);

export default async function SetupPage() {
	// Keep local setup usable, but never publish configuration details to visitors.
	if (process.env.NODE_ENV === "production") {
		if (!isClerkConfigured()) redirect("/access-denied");
		const access = await getPortalAccess();
		if (
			!access.authenticated ||
			!access.authorization.allowed ||
			access.authorization.role !== "admin"
		) redirect("/access-denied");
	}
	const clerkReady = isClerkConfigured();
	const inviteReady = isInviteCodeConfigured();
	const domainsReady = getAuthConfig().allowedEmailDomains.length > 0;

	return (
		<Flex direction="column" w="full">
			<Flex w="full" justify="center" bgGradient="blue" color="white">
				<Box w="full" maxW="4xl" p={{ base: "16 8", sm: "12 5" }}>
					<Text
						fontSize="sm"
						fontWeight="bold"
						letterSpacing="widest"
						color="gray.200"
					>
						AUTHENTICATION SETUP
					</Text>
					<Heading as="h1" size="2xl" mt="4">
						認証システムの初期設定
					</Heading>
				</Box>
			</Flex>
			<Section>
				<Flex direction="column">
					<Step number="01" title="Clerkを設定">
						<Text>
							<code>.env.local</code>へ公開可能キーと秘密鍵を設定し、Clerk
							Dashboardでメール認証コードとパスワードを有効にします。
						</Text>
						<Flex
							align="center"
							gap="2"
							mt="3"
							color={clerkReady ? "green.600" : "orange.600"}
						>
							{clerkReady ? (
								<IconCheck size={18} />
							) : (
								<IconSettings size={18} />
							)}
							<Text fontSize="sm">{clerkReady ? "設定済み" : "未設定"}</Text>
						</Flex>
					</Step>
					<Step number="02" title="学校メールドメインを設定">
						<Text>
							<code>ALLOWED_EMAIL_DOMAINS</code>
							へ、メールアドレスの@より後ろを設定します。
						</Text>
						<Flex
							align="center"
							gap="2"
							mt="3"
							color={domainsReady ? "green.600" : "orange.600"}
						>
							<IconMailCheck size={18} />
							<Text fontSize="sm">{domainsReady ? "設定済み" : "未設定"}</Text>
						</Flex>
					</Step>
					<Step number="03" title="秘密の暗号（招待コード）を設定">
						<Text>
							ターミナルで <code>pnpm invite-code</code> を実行し、表示された
							<code>DATADREAMERS_INVITE_CODE_HASH</code>の1行を
							<code>.env.local</code>
							へ追加します。招待コード自体は保存されません。
						</Text>
						<Flex
							align="center"
							gap="2"
							mt="3"
							color={inviteReady ? "green.600" : "orange.600"}
						>
							<IconKey size={18} />
							<Text fontSize="sm">
								{inviteReady ? "ハッシュ設定済み" : "未設定"}
							</Text>
						</Flex>
					</Step>
					<Step number="04" title="管理者を指定">
						<Text>
							adminにするユーザーだけ、ClerkのPublic metadataへ{" "}
							<code>{`{ "role": "admin" }`}</code>{" "}
							を設定します。招待コードから自動付与されるのはeditorだけです。
						</Text>
					</Step>
				</Flex>
			</Section>
		</Flex>
	);
}
