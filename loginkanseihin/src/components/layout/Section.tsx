import { Container, Flex, type FlexProps } from "@yamada-ui/react";
import type { FC, ReactNode } from "react";

type Props = { parent?: FlexProps; children: ReactNode };

const Section: FC<Props> = ({ parent, children }) => (
	<Flex w="full" justify="center" {...parent}>
		<Container maxW="4xl" p="4rem 2rem">
			{children}
		</Container>
	</Flex>
);

export default Section;
