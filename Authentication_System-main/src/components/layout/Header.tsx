import { Flex, Heading } from "@yamada-ui/react";
import Image from "next/image";
import Link from "next/link";
import { AuthControls } from "./AuthControls";
import Navigation from "./Navigation";

export default function Header({
	clerkConfigured,
}: {
	clerkConfigured: boolean;
}) {
	return (
		<Flex
			as="header"
			justify="space-between"
			alignItems="center"
			p="4"
			position="sticky"
			top="0"
			zIndex="sticky"
			w="full"
			h="16"
			bgGradient="blue"
		>
			<Flex as={Link} direction="row" href="/" alignItems="center">
				<Image
					src="/images/icon-removebg.png"
					alt=""
					aria-hidden
					width={50}
					height={50}
					priority
				/>
				<Heading
					as="span"
					fontWeight="bold"
					color="white"
					fontSize={{ base: "2xl", sm: "lg" }}
				>
					Data Dreamers
				</Heading>
			</Flex>
			<Flex align="center" gap={{ base: "6", md: "3" }}>
				<Navigation />
				<AuthControls configured={clerkConfigured} />
			</Flex>
		</Flex>
	);
}
