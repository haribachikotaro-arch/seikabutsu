"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { UIProvider } from "@yamada-ui/react";
import type { ReactNode } from "react";
import { config, theme } from "~/theme";

const clerkAppearance = {
	variables: {
		colorPrimary: "#0E416B",
		borderRadius: "0rem",
	},
	elements: {
		cardBox: { boxShadow: "none", width: "100%" },
		card: { boxShadow: "none", padding: "0" },
		socialButtonsBlockButton: { display: "none" },
		socialButtonsBlockButtonText: { display: "none" },
		dividerRow: { display: "none" },
		formButtonPrimary: { borderRadius: "0", boxShadow: "none" },
		formFieldInput: { borderRadius: "0" },
		footerActionLink: { color: "#0E416B" },
	},
};

export default function Providers({
	children,
	clerkConfigured,
}: {
	children: ReactNode;
	clerkConfigured: boolean;
}) {
	const content = (
		<UIProvider theme={theme} config={config}>
			{children}
		</UIProvider>
	);
	if (!clerkConfigured) return content;

	return (
		<ClerkProvider
			signInUrl="/sign-in"
			signUpUrl="/sign-up"
			signInFallbackRedirectUrl="/portal"
			signUpForceRedirectUrl="/join"
			appearance={clerkAppearance}
		>
			{content}
		</ClerkProvider>
	);
}
