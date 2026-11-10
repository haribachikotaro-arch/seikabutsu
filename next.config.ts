import type { NextConfig } from "next";
const publicKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const clerkOrigin =
  process.env.CLERK_FRONTEND_ORIGIN ||
  (publicKey
    ? "https://" +
      Buffer.from(publicKey.split("_").slice(2).join("_"), "base64")
        .toString()
        .replace(/\$$/, "")
    : "");
if (
  clerkOrigin &&
  (!clerkOrigin.startsWith("https://") ||
    new URL(clerkOrigin).origin !== clerkOrigin)
)
  throw new Error("CLERK_FRONTEND_ORIGIN must be an HTTPS origin");
const config: NextConfig = {
  turbopack: { root: process.cwd() },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), clipboard-read=(), clipboard-write=()",
          },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' blob: ${process.env.NODE_ENV === "development" ? "'unsafe-eval'" : ""} ${clerkOrigin} https://challenges.cloudflare.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data: blob:; connect-src 'self' ${clerkOrigin} https://challenges.cloudflare.com https://clerk-telemetry.com; frame-src 'self' https://challenges.cloudflare.com https:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'`,
          },
        ],
      },
    ];
  },
};
export default config;
