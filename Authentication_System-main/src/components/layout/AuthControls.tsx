"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { Button, Flex, Text } from "@yamada-ui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AuthControls({ configured }: { configured: boolean }) {
	if (!configured) {
		return (
			<Button as={Link} href="/setup" size="sm" borderRadius="0">
				Setup
			</Button>
		);
	}

	return <ConfiguredAuthControls />;
}

function ConfiguredAuthControls() {
	const { isLoaded, isSignedIn } = useAuth();
	const pathname = usePathname();
	const isPortal = pathname === "/portal" || pathname.startsWith("/portal/");

	if (!isLoaded) return null;

	if (!isSignedIn) {
		return (
			<Button
				as={Link}
				href="/sign-in"
				size="sm"
				borderRadius="0"
				bgGradient="white"
				color="black"
			>
				Sign in
			</Button>
		);
	}

	return (
		<Flex align="center" gap="3">
			<Flex
				borderBottom="1px solid transparent"
				_hover={{ borderBottomColor: "white" }}
			>
				<Link href="/portal" prefetch={false}>
					<Text
						fontSize="lg"
						color="white"
						_hover={{ bgGradient: "whiteHover", bgClip: "text" }}
					>
						Portal
					</Text>
				</Link>
			</Flex>
			{isPortal && <UserButton />}
		</Flex>
	);
}
