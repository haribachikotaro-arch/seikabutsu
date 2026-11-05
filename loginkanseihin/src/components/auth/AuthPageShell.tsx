import { Box, Container, Flex, Grid, Heading, Text } from "@yamada-ui/react";
import type { ReactNode } from "react";

export default function AuthPageShell({
	eyebrow,
	title,
	description,
	children,
}: {
	eyebrow: string;
	title: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<Flex w="full" grow={1} bgColor="gray.50" justify="center">
			<Container
				maxW="6xl"
				px={{ base: "8", sm: "5" }}
				py={{ base: "20", md: "12" }}
			>
				<Grid
					templateColumns={{
						base: "minmax(0, 1fr) minmax(360px, 440px)",
						md: "1fr",
					}}
					gap={{ base: "16", md: "10" }}
					alignItems="center"
				>
					<Flex direction="column" gap="6" maxW="xl">
						<Text
							color="banner"
							fontSize="sm"
							fontWeight="bold"
							letterSpacing="widest"
						>
							{eyebrow}
						</Text>
						<Heading as="h1" size="3xl" lineHeight="1.35">
							{title}
						</Heading>
						<Text color="gray.700" lineHeight="2">
							{description}
						</Text>
						<Box borderLeft="4px solid" borderColor="banner" pl="5" py="2">
							<Text fontWeight="bold">Data Dreamers Member Portal</Text>
							<Text color="gray.600" fontSize="sm">
								学校メール・招待コード・ロールをサーバー側で確認します。
							</Text>
						</Box>
					</Flex>
					<Box
						bgColor="white"
						border="1px solid"
						borderColor="gray.200"
						borderTop="4px solid"
						borderTopColor="banner"
						p={{ base: "10", sm: "6" }}
					>
						{children}
					</Box>
				</Grid>
			</Container>
		</Flex>
	);
}
