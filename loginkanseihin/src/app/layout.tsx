import { ColorModeScript, Flex } from "@yamada-ui/react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Footer from "~/components/layout/Footer";
import Header from "~/components/layout/Header";
import { isClerkConfigured } from "~/lib/auth-config";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	metadataBase: new URL("https://data-dreamers.vercel.app"),
	title: {
		template: "%s | Data Dreamers",
		default: "Member Portal | Data Dreamers",
	},
	description: "Data Dreamersメンバー向け認証・記事投稿ポータルです。",
	robots: { index: false, follow: false },
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const clerkConfigured = isClerkConfigured();
	return (
		<html lang="ja" suppressHydrationWarning>
			<body className={inter.className} suppressHydrationWarning>
				<ColorModeScript initialColorMode="light" />
				<Providers clerkConfigured={clerkConfigured}>
					<Flex direction="column" minHeight="100vh" w="full">
						<Header clerkConfigured={clerkConfigured} />
						<Flex as="main" direction="column" align="center" grow={1} w="full">
							{children}
						</Flex>
						<Footer />
					</Flex>
				</Providers>
			</body>
		</html>
	);
}
