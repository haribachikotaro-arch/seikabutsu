import { Flex, Text } from "@yamada-ui/react";
import { PUBLIC_SITE_LINKS } from "~/constants/site-links";
import SideMenu from "./SideMenu";

export default function Navigation() {
	return (
		<>
			<Flex gapX="6" display={{ base: "flex", md: "none" }}>
				{PUBLIC_SITE_LINKS.map((item) => (
					<Flex
						key={item.href}
						borderBottom="1px solid transparent"
						_hover={{ borderBottomColor: "white" }}
					>
						<a href={item.href} target="_blank" rel="noreferrer">
							<Text
								fontSize="lg"
								color="white"
								_hover={{ bgGradient: "whiteHover", bgClip: "text" }}
							>
								{item.title}
							</Text>
						</a>
					</Flex>
				))}
			</Flex>
			<Flex display={{ base: "none", md: "flex" }}>
				<SideMenu />
			</Flex>
		</>
	);
}
