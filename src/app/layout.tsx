import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "DataDreamers — 学生がつくったものと、その過程。",
    template: "%s | DataDreamers",
  },
  description:
    "学生ITコミュニティ DataDreamers の制作物と活動記録。つくって、試して、学んだことを公開しています。",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  const body = (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
    <ClerkProvider>{body}</ClerkProvider>
  ) : (
    body
  );
}
