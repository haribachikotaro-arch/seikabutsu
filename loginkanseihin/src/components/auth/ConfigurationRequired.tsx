import { IconKey, IconSettings } from "@tabler/icons-react";
import { Box, Flex, Heading, Text } from "@yamada-ui/react";
import Link from "next/link";
import { OutlineButton } from "~/components/atoms/Button";

export default function ConfigurationRequired({
	inviteOnly = false,
}: {
	inviteOnly?: boolean;
}) {
	const production = process.env.NODE_ENV === "production";
	return (
		<Box
			border="1px solid"
			borderColor="gray.200"
			borderTop="4px solid"
			borderTopColor="banner"
			bgColor="white"
			p="8"
		>
			<Flex direction="column" gap="5" align="start">
				{inviteOnly && !production ? (
					<IconKey size={32} color="#0E416B" />
				) : (
					<IconSettings size={32} color="#0E416B" />
				)}
				<Heading as="h1" size="lg">
					{production
						? "現在認証を利用できません"
						: inviteOnly
						? "招待コードの設定が必要です"
						: "Clerkの初期設定が必要です"}
				</Heading>
				<Text color="gray.700">
					{production
						? "時間をおいて再試行してください。解決しない場合は運営担当者へお問い合わせください。"
						: inviteOnly
						? "招待コードのハッシュを.env.localへ設定すると、メンバー確認を開始できます。"
						: ".env.localへClerk APIキーと学校メールドメインを設定してください。"}
				</Text>
				{!production && (
					<Link href="/setup">
						<OutlineButton>設定手順を見る</OutlineButton>
					</Link>
				)}
			</Flex>
		</Box>
	);
}
