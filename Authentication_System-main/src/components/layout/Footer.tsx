import { IconExternalLink } from "@tabler/icons-react";
import { Container, Flex, Heading, Separator, Text } from "@yamada-ui/react";
import Image from "next/image";
import Link from "next/link";
import { PUBLIC_SITE_LINKS, PUBLIC_SITE_URL } from "~/constants/site-links";

export default function Footer() {
	return (
		<Flex justify="center" w="full" bgGradient="blue">
			<Container maxW="6xl" p="6" as="footer">
				<Flex
					direction={{ base: "row", md: "column" }}
					justify="space-between"
					align={{ base: "center", md: "start" }}
					gap="6"
				>
					<Flex as={Link} href="/" align="center">
						<Image
							src="/images/icon-removebg.png"
							alt=""
							width={50}
							height={50}
						/>
						<Heading as="span" color="white" fontSize="2xl">
							Data Dreamers
						</Heading>
					</Flex>
					<Flex gap={{ base: "6", md: "3" }} wrap="wrap">
						{PUBLIC_SITE_LINKS.map((item) => (
							<a
								key={item.href}
								href={item.href}
								target="_blank"
								rel="noreferrer"
							>
								<Text color="gray.200" fontSize="sm">
									{item.title}
								</Text>
							</a>
						))}
					</Flex>
				</Flex>
				<Separator py="4" />
				<Flex
					justify="space-between"
					align="center"
					direction={{ base: "row", sm: "column" }}
					gap="3"
				>
					<Text fontSize="sm" color="gray.200">
						© 2026 Data Dreamers. All Rights Reserved.
					</Text>
					<a href={PUBLIC_SITE_URL} target="_blank" rel="noreferrer">
						<Flex align="center" gap="2" color="gray.200">
							<Text fontSize="sm">公式サイト</Text>
							<IconExternalLink size={15} />
						</Flex>
					</a>
				</Flex>
			</Container>
		</Flex>
	);
}
