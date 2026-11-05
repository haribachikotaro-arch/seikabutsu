import { NextResponse, type NextRequest } from "next/server";

export default function proxy(_request: NextRequest) {
  // Clerk is handled by the client SDK and by explicit token verification in
  // route handlers. Leaving this proxy as a pass-through prevents Clerk's
  // middleware from recursively proxying /api/me to the Next dev server.
  return NextResponse.next();
}
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)",
    "/(api)(.*)",
  ],
};
