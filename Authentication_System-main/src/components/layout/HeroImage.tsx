import { Box, Text } from "@yamada-ui/react";
import Image, { type ImageProps } from "next/image";
import type { FC, ReactNode } from "react";

interface Props extends ImageProps {
	children?: ReactNode;
}

const HeroImage: FC<Props> = ({ children, ...rest }) => (
	<Box h="48vw" minH="280px" maxH="460px" w="100vw" pos="relative">
		<Image {...rest} fill sizes="100vw" style={{ objectFit: "cover" }} />
		<Box position="absolute" bgGradient="blackAlpha" w="full" h="full" />
		<Box
			position="absolute"
			bgColor="banner"
			bottom="10%"
			left="-30"
			color="white"
			py={{ base: "4", md: "2" }}
			px={{ base: "6", md: "4" }}
			fontWeight="bold"
			fontSize={{ base: "xl", md: "lg" }}
			transform="skewX(30deg)"
		>
			<Text transform="skewX(-30deg)" pl="30">
				{children}
			</Text>
		</Box>
	</Box>
);

export default HeroImage;
