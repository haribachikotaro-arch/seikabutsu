import { IconShieldCheck, IconWriting } from "@tabler/icons-react";
import { Flex, Text } from "@yamada-ui/react";
import type { PortalRole } from "~/lib/auth-config";

export default function RoleBadge({ permission }: { permission: PortalRole }) {
	const isAdmin = permission === "admin";
	return (
		<Flex
			w="fit-content"
			align="center"
			gap="2"
			px="3"
			py="1"
			border="1px solid"
			borderColor={isAdmin ? "banner" : "gray.300"}
			color={isAdmin ? "banner" : "gray.700"}
		>
			{isAdmin ? <IconShieldCheck size={16} /> : <IconWriting size={16} />}
			<Text fontSize="xs" fontWeight="bold" letterSpacing="wide">
				{isAdmin ? "ADMIN" : "EDITOR"}
			</Text>
		</Flex>
	);
}
