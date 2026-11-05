import {
	IconArrowRight,
	IconKey,
	IconMailCheck,
	IconShieldCheck,
} from "@tabler/icons-react";
import { Box, Flex, Grid, Heading, Separator, Text } from "@yamada-ui/react";
import type { Metadata } from "next";
import Link from "next/link";
import { GhostButton, OutlineButton } from "~/components/atoms/Button";
import HeroImage from "~/components/layout/HeroImage";
import Section from "~/components/layout/Section";
import { isClerkConfigured } from "~/lib/auth-config";

export const metadata: Metadata = { title: "Member Portal" };

const checks = [
	{
		icon: IconMailCheck,
		title: "学校メール",
		text: "Clerkでメールアドレスの所有者を確認します。",
	},
	{
		icon: IconKey,
		title: "秘密の暗号",
		text: "Data Dreamersから共有された招待コードを確認します。",
	},
	{
		icon: IconShieldCheck,
		title: "メンバーロール",
		text: "editorとadminの権限をサーバー側で分離します。",
	},
] as const;

export default function HomePage() {
	const configured = isClerkConfigured();
	return (
		<Flex direction="column" align="center" w="full">
			<HeroImage
				src="/images/hands-typing.jpg"
				alt="ノートパソコンで活動するData Dreamersメンバー"
				priority
			>
				MEMBER PORTAL
			</HeroImage>
			<Section>
				<Flex direction="column" gap="8">
					<Box>
						<Heading as="h1" size="2xl" textAlign="center">
							Data Dreamers メンバーポータル
						</Heading>
						<Text textAlign="center" color="gray.700">
							Member authentication &amp; content workspace
						</Text>
					</Box>
					<Separator />
					<Text textAlign="center" lineHeight="2">
						活動記事を安全に発信するためのメンバー専用入口です。
						<br />
						本人確認、学校メール、招待コード、ロールの順にアクセスを確認します。
					</Text>
					<Flex
						justify="center"
						gap="4"
						direction={{ base: "row", sm: "column" }}
					>
						<Link href={configured ? "/sign-in" : "/setup"}>
							<OutlineButton rightIcon={<IconArrowRight />}>
								{configured ? "ログイン" : "初期設定を確認"}
							</OutlineButton>
						</Link>
						{configured && (
							<Link href="/sign-up">
								<GhostButton>アカウントを作成</GhostButton>
							</Link>
						)}
					</Flex>
				</Flex>
			</Section>
			<Section parent={{ bgColor: "gray.50" }}>
				<Heading as="h2" size="lg">
					アクセス確認の流れ
				</Heading>
				<Grid
					templateColumns={{ base: "repeat(3, 1fr)", md: "1fr" }}
					gap="5"
					mt="8"
				>
					{checks.map(({ icon: Icon, title, text }, index) => (
						<Box
							key={title}
							border="1px solid"
							borderColor="gray.200"
							borderTop="3px solid"
							borderTopColor="banner"
							bgColor="white"
							p="6"
						>
							<Flex justify="space-between" color="banner">
								<Icon size={28} />
								<Text fontSize="xs" fontWeight="bold">
									0{index + 1}
								</Text>
							</Flex>
							<Heading as="h3" size="md" mt="6">
								{title}
							</Heading>
							<Text color="gray.700" fontSize="sm" mt="3">
								{text}
							</Text>
						</Box>
					))}
				</Grid>
			</Section>
			<Section>
				<Heading as="h2" size="lg">
					権限について
				</Heading>
				<Text lineHeight="2">
					招待コードの確認に成功したユーザーにはeditorロールが付与されます。
					adminロールは運営担当者のみがClerkの安全な管理経路から設定できます。
				</Text>
			</Section>
		</Flex>
	);
}
