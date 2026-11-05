import { IconLock } from "@tabler/icons-react";
import { Box, Button, Flex, Heading, Text } from "@yamada-ui/react";
import type { Metadata } from "next";
import Link from "next/link";
import SignOutControl from "~/components/auth/SignOutControl";
import Section from "~/components/layout/Section";
import { isClerkConfigured } from "~/lib/auth-config";

export const metadata: Metadata = { title: "アクセスできません" };

export default function AccessDeniedPage() {
	const content = {
		label: "ACCESS DENIED",
		title: "アクセスできません",
		body: "認証を完了できませんでした。再度ログインしてください。解決しない場合は運営担当者へお問い合わせください。",
	};
	const configured = isClerkConfigured();

	return (
		<Section>
			<Box
				maxW="2xl"
				mx="auto"
				border="1px solid"
				borderColor="gray.200"
				borderTop="4px solid"
				borderTopColor="banner"
				p={{ base: "12", sm: "7" }}
				textAlign="center"
			>
				<Flex direction="column" align="center" gap="5">
					<IconLock size={36} color="#0E416B" />
					<Text
						fontWeight="bold"
						fontSize="sm"
						letterSpacing="widest"
						color="banner"
					>
						{content.label}
					</Text>
					<Heading as="h1" size="xl">
						{content.title}
					</Heading>
					<Text color="gray.700">{content.body}</Text>
					<Flex gap="3" direction={{ base: "row", sm: "column" }}>
						<Button
							as={Link}
							href={configured ? "/sign-in" : "/setup"}
							borderRadius="0"
							bgColor="banner"
							color="white"
						>
							{configured ? "ログイン画面へ" : "設定を確認"}
						</Button>
						{configured && <SignOutControl />}
					</Flex>
				</Flex>
			</Box>
		</Section>
	);
}
