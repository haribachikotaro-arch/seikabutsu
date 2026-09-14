import type { NextConfig } from "next";
const origins = (process.env.NEXT_PUBLIC_EMBED_ORIGINS || "")
  .split(",")
  .filter(Boolean)
  .map((v) => {
    const u = new URL(v);
    if (u.protocol !== "https:" || u.origin !== v)
      throw new Error("EMBED_ORIGINS must be exact HTTPS origins");
    return u.origin;
  });
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
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === "development" ? "'unsafe-eval'" : ""} ${clerkOrigin} https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data: blob:; connect-src 'self' ${clerkOrigin} https://challenges.cloudflare.com; frame-src 'self' https://challenges.cloudflare.com ${origins.join(" ")}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'`,
          },
        ],
      },
    ];
  },
};
export default config;
