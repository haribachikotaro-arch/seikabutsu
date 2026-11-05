import { NextResponse } from "next/server";

export function authFailure(status = 403, headers?: HeadersInit) {
  const response = NextResponse.json(
    { ok: false, error: "authentication_failed" },
    { status, headers },
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
