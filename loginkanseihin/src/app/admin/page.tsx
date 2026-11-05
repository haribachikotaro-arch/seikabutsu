import { IconShieldLock } from "@tabler/icons-react";
import { Box, Flex, Heading, Text } from "@yamada-ui/react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import RoleBadge from "~/components/auth/RoleBadge";
import Section from "~/components/layout/Section";
import { isClerkConfigured } from "~/lib/auth-config";
import { getPortalAccess } from "~/lib/portal-access";

export const metadata: Metadata = { title: "管理者ページ" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
	if (!isClerkConfigured()) redirect("/setup");
	const access = await getPortalAccess();
	if (!access.authenticated) redirect("/sign-in?redirect_url=/admin");
	if (!access.authorization.allowed) {
		if (access.authorization.reason === "invite_required") redirect("/join");
		redirect("/access-denied");
	}
	if (access.authorization.role !== "admin")
		redirect("/access-denied");

	return (
		<Flex direction="column" w="full">
			<Flex w="full" justify="center" bgGradient="blue" color="white">
				<Box w="full" maxW="4xl" p={{ base: "16 8", sm: "12 5" }}>
					<RoleBadge permission="admin" />
					<Heading as="h1" size="2xl" mt="6">
						管理者ページ
					</Heading>
					<Text color="gray.200" mt="3">
						adminロールのサーバー側検証に成功しました。
					</Text>
				</Box>
			</Flex>
			<Section>
				<IconShieldLock size={36} color="#0E416B" />
				<Heading as="h2" size="lg" mt="5">
					管理者アクセスは有効です
				</Heading>
				<Text color="gray.700" lineHeight="2">
					このページと管理者APIはadmin以外からアクセスできません。ユーザー管理機能を追加する際は、この認可境界の内側に実装します。
				</Text>
			</Section>
		</Flex>
	);
}
