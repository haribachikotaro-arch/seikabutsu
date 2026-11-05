import {
	IconExternalLink,
	IconSettings,
	IconShieldCheck,
} from "@tabler/icons-react";
import { Box, Flex, Heading, Text } from "@yamada-ui/react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OutlineButton } from "~/components/atoms/Button";
import ConfigurationRequired from "~/components/auth/ConfigurationRequired";
import RoleBadge from "~/components/auth/RoleBadge";
import Section from "~/components/layout/Section";
import SubmissionTypeSelector from "~/components/portal/SubmissionTypeSelector";
import { isClerkConfigured } from "~/lib/auth-config";
import { getPortalAccess } from "~/lib/portal-access";

export const metadata: Metadata = { title: "メンバーポータル" };
export const dynamic = "force-dynamic";

export default async function PortalPage() {
	if (!isClerkConfigured())
		return (
			<Section>
				<ConfigurationRequired />
			</Section>
		);
	const access = await getPortalAccess();
	if (!access.authenticated) redirect("/sign-in?redirect_url=/portal");
	if (!access.authorization.allowed) {
		if (access.authorization.reason === "invite_required") redirect("/join");
		redirect("/access-denied");
	}

	const { email, role } = access.authorization;
	const name =
		[access.user.firstName, access.user.lastName].filter(Boolean).join(" ") ||
		email.split("@")[0];

	return (
		<Flex direction="column" w="full">
			<Flex w="full" justify="center" bgGradient="blue" color="white">
				<Box w="full" maxW="4xl" p={{ base: "16 8", sm: "12 5" }}>
					<RoleBadge permission={role} />
					<Heading as="h1" size="2xl" mt="6">
						おかえりなさい、{name}さん。
					</Heading>
					<Text color="gray.200" mt="3">
						{email}
					</Text>
				</Box>
			</Flex>
			<Section>
				<Heading as="h2" size="lg">
					投稿する内容を選択
				</Heading>
				<Text color="gray.700" mt="3">
					作成したい投稿の種類を選んでください。
				</Text>
				<SubmissionTypeSelector />
			</Section>
			<Section parent={{ bgColor: "gray.50" }}>
				<Heading as="h2" size="lg">
					アカウント権限
				</Heading>
				{role === "admin" ? (
					<Box mt="8" border="1px solid" borderColor="banner" p="7">
						<IconShieldCheck size={30} color="#0E416B" />
						<Heading as="h3" size="md" mt="5">
							管理者ページ
						</Heading>
						<Text color="gray.700" mt="3">
							adminロールだけがアクセスできる管理領域です。
						</Text>
						<Link href="/admin">
							<OutlineButton mt="5">管理者ページへ</OutlineButton>
						</Link>
					</Box>
				) : (
					<Box
						mt="8"
						border="1px solid"
						borderColor="gray.200"
						p="7"
						bgColor="white"
					>
						<IconSettings size={30} color="#0E416B" />
						<Heading as="h3" size="md" mt="5">
							Editor access
						</Heading>
						<Text color="gray.700" mt="3">
							記事の作成・編集に必要なeditor権限が有効です。
						</Text>
					</Box>
				)}
			</Section>
			<Section>
				<Heading as="h2" size="lg">
					セキュリティ状態
				</Heading>
				<Flex align="center" gap="3" mt="5">
					<IconShieldCheck color="#0E416B" />
					<Text>学校メール・招待コード・ロールの確認済み</Text>
				</Flex>
				<a
					href="https://data-dreamers.vercel.app"
					target="_blank"
					rel="noreferrer"
				>
					<OutlineButton mt="6" rightIcon={<IconExternalLink />}>
						公式サイトを開く
					</OutlineButton>
				</a>
			</Section>
		</Flex>
	);
}
