"use client";

import { IconExternalLink, IconMenu2 } from "@tabler/icons-react";
import {
	Drawer,
	DrawerBody,
	DrawerHeader,
	Flex,
	IconButton,
	Text,
	useDisclosure,
} from "@yamada-ui/react";
import Link from "next/link";
import { PUBLIC_SITE_LINKS, PUBLIC_SITE_URL } from "~/constants/site-links";

export default function SideMenu() {
	const { open, onOpen, onClose } = useDisclosure();
	return (
		<>
			<IconButton
				icon={<IconMenu2 size={24} />}
				variant="outline"
				onClick={onOpen}
				color="white"
				aria-label="メニューを開く"
				borderRadius="0"
				_hover={{ bg: "blackAlpha.500" }}
			/>
			<Drawer
				open={open}
				onClose={onClose}
				size="sm"
				color="white"
				style={{
					backgroundImage: "linear-gradient(to bottom right, #0E416B, #000029)",
				}}
			>
				<DrawerHeader>Data Dreamers</DrawerHeader>
				<DrawerBody>
					<Flex direction="column" gap="6" mt="6">
						<Link href="/" onClick={onClose}>
							<Text fontSize="lg">Member Portal</Text>
						</Link>
						{PUBLIC_SITE_LINKS.map((item) => (
							<a
								key={item.href}
								href={item.href}
								target="_blank"
								rel="noreferrer"
								onClick={onClose}
							>
								<Flex align="center" gap="2">
									<Text fontSize="lg">{item.title}</Text>
									<IconExternalLink size={15} />
								</Flex>
							</a>
						))}
						<a
							href={PUBLIC_SITE_URL}
							target="_blank"
							rel="noreferrer"
							onClick={onClose}
						>
							<Text color="gray.300" fontSize="sm">
								公式サイトを開く
							</Text>
						</a>
					</Flex>
				</DrawerBody>
			</Drawer>
		</>
	);
}
