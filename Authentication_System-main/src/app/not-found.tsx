import { Box, Heading, Text } from "@yamada-ui/react";
import Link from "next/link";
import { OutlineButton } from "~/components/atoms/Button";
import Section from "~/components/layout/Section";

export default function NotFound() {
	return (
		<Section>
			<Box textAlign="center" py="16">
				<Text color="banner" fontWeight="bold" letterSpacing="widest">
					404 · NOT FOUND
				</Text>
				<Heading as="h1" size="xl" mt="4">
					ページが見つかりません
				</Heading>
				<Link href="/">
					<OutlineButton mt="8">ポータルの入口へ戻る</OutlineButton>
				</Link>
			</Box>
		</Section>
	);
}
