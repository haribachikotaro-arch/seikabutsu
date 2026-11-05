import { Button, type ButtonProps } from "@yamada-ui/react";
import type { FC } from "react";

export const OutlineButton: FC<ButtonProps> = ({ children, ...rest }) => (
	<Button
		variant="outline"
		borderColor="black"
		color="black"
		bgColor="white"
		borderRadius="0"
		_hover={{ bgColor: "black", color: "white" }}
		{...rest}
	>
		{children}
	</Button>
);

export const SolidButton: FC<ButtonProps> = ({ children, ...rest }) => (
	<Button
		borderRadius="0"
		bgGradient="white"
		color="black"
		_hover={{ bgGradient: "whiteHover" }}
		{...rest}
	>
		{children}
	</Button>
);

export const GhostButton: FC<ButtonProps> = ({ children, ...rest }) => {
	return (
		<Button
			variant="ghost"
			borderRadius="0"
			fontWeight="bold"
			borderBottom="2px solid transparent"
			_hover={{ borderBottomColor: "#0E416B" }}
			{...rest}
		>
			{children}
		</Button>
	);
};
