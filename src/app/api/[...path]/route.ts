import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { seed } from "@/lib/seed";
import {
  editable,
  validateEntry,
  imageError,
  type Entry,
  type Member,
} from "@/lib/model";
export const runtime = "nodejs";
type Store = {
  entries: Entry[];
  members: Member[];
  requests: Record<string, { hash: string; entry: Entry }>;
};
const demoMembers: Member[] = [
  { id: "demo-editor", name: "制作メンバー", role: "editor" },
  { id: "demo-admin", name: "編集メンバー", role: "admin" },
];
function localSecret() {
  if (process.env.NODE_ENV !== "development") return randomBytes(32);
  mkdirSync("tmp", { recursive: true });
  try {
    return readFileSync("tmp/demo-secret");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    const value = randomBytes(32);
    try {
      writeFileSync("tmp/demo-secret", value, { flag: "wx" });
      return value;
    } catch {
      return readFileSync("tmp/demo-secret");
    }
  }
}
const secret = localSecret();
let queue = Promise.resolve();
async function store(): Promise<Store> {
  try {
    return JSON.parse(await readFile("tmp/demo-data.json", "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    return {
      entries: structuredClone(seed),
      members: demoMembers,
      requests: {},
    };
  }
}
function sign(value: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}
function session(req: NextRequest, data: Store) {
  const [id, expires, mac] = req.cookies.get("dd-demo")?.value.split(".") || [];
  if (!id || !expires || !mac || Number(expires) < Date.now()) return null;
  const expected = sign(id + "." + expires);
  if (
    mac.length !== expected.length ||
    !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
  )
    return null;
  return data.members.find((m) => m.id === id) || null;
}
function fail(message: string, status = 400, fields?: Record<string, string>) {
  return NextResponse.json({ message, fields }, { status });
}
function imageSignature(bytes: Uint8Array, type: string) {
  return type === "image/jpeg"
    ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : type === "image/png"
      ? bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10"
      : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}
async function handle(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const route = path.join("/");
  const write = !["GET", "HEAD"].includes(req.method);
  const expectedOrigin =
    process.env.SITE_ORIGIN ||
    `${req.nextUrl.protocol}//${req.headers.get("host")}`;
  if (write && req.headers.get("origin") !== expectedOrigin)
    return fail("利用元が一致しません。ページを開き直してください。", 403);
  if (process.env.WORKER_API_URL) {
    try {
      const token = req.headers.get("authorization");
      const contentType = req.headers.get("content-type");
      const upstream = await fetch(
        process.env.WORKER_API_URL.replace(/\/$/, "") + "/api/" + route,
        {
          method: req.method,
          headers: {
            ...(token ? { Authorization: token } : {}),
            ...(contentType ? { "Content-Type": contentType } : {}),
            Origin: expectedOrigin,
          },
          body: write ? await req.arrayBuffer() : undefined,
          cache: "no-store",
          signal: AbortSignal.timeout(25000),
        },
      );
      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    } catch {
      return fail(
        "保存先に接続できませんでした。入力内容は保持されています。再試行してください。",
        503,
      );
    }
  }
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ) {
    if (route === "public" && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
      return NextResponse.json({ entries: seed });
    if (route === "me") return NextResponse.json({ member: null });
    return fail("公開サービスの接続準備中です。", 503);
  }
  // Local-only development data store. All mutations are serialized for duplicate/optimistic checks.
  let unlock!: () => void;
  const previous = queue;
  queue = new Promise<void>((r) => (unlock = r));
  await previous;
  try {
    const data = await store();
    const member = session(req, data);
    const commit = async () => {
      await mkdir("tmp", { recursive: true });
      await writeFile("tmp/demo-data.json", JSON.stringify(data, null, 2));
    };
    if (route === "public" && req.method === "GET")
      return NextResponse.json({
        entries: data.entries
          .filter((e) => e.status === "published")
          .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
      });
    if (route === "me" && req.method === "GET")
      return NextResponse.json({ member });
    if (route === "demo-session") {
      if (req.method === "DELETE") {
        const res = NextResponse.json({ ok: true });
        res.cookies.delete("dd-demo");
        return res;
      }
      if (req.method !== "POST") return fail("許可されていない操作です。", 405);
      const { role } = await req.json();
      const selected = data.members.find(
        (m) => m.id === (role === "admin" ? "demo-admin" : "demo-editor"),
      )!;
      const value = selected.id + "." + (Date.now() + 3600000);
      const res = NextResponse.json({ member: selected });
      res.cookies.set("dd-demo", value + "." + sign(value), {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        maxAge: 3600,
      });
      return res;
    }
    if (!member)
      return fail(
        "ログインが必要です。セッション切れの場合は再ログインしてください。",
        401,
      );
    if (route === "mine" && req.method === "GET")
      return NextResponse.json({
        entries: data.entries.filter((e) => e.clerkUserId === member.id),
      });
    if (route === "admin" && req.method === "GET") {
      if (member.role !== "admin") return fail("管理者権限が必要です。", 403);
      return NextResponse.json({
        entries: data.entries,
        members: data.members,
      });
    }
    if (path[0] === "members" && req.method === "PATCH") {
      if (member.role !== "admin" || path[1] === member.id)
        return fail("この権限は変更できません。", 403);
      const { role } = await req.json();
      if (!["editor", "admin"].includes(role)) return fail("権限が不正です。");
      const m = data.members.find((m) => m.id === path[1]);
      if (!m) return fail("メンバーが見つかりません。", 404);
      m.role = role;
      await commit();
      return NextResponse.json({ member: m });
    }
    if (route === "media" && req.method === "POST") {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return fail("画像を選んでください。");
      const error = imageError(file);
      if (error) return fail(error);
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!imageSignature(bytes, file.type))
        return fail("画像の内容とファイル形式が一致しません。");
      await mkdir("public/uploads", { recursive: true });
      const name =
        crypto.randomUUID() +
        "." +
        { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[
          file.type
        ];
      await writeFile("public/uploads/" + name, bytes);
      return NextResponse.json({ url: "/uploads/" + name });
    }
    if (!["works", "articles"].includes(path[0]))
      return fail("APIが見つかりません。", 404);
    const existing = data.entries.find(
      (e) => e.id === path[1] && e.kind === path[0],
    );
    if (req.method === "GET") {
      if (!existing) return fail("投稿が見つかりません。", 404);
      if (!editable(existing, member))
        return fail("他のメンバーの投稿は編集できません。", 403);
      return NextResponse.json({ entry: existing });
    }
    if (!["POST", "PATCH"].includes(req.method))
      return fail("許可されていない操作です。", 405);
    if (req.method === "PATCH" && !existing)
      return fail("投稿が見つかりません。", 404);
    const input = await req.json();
    const entry = { ...input.entry, kind: path[0] } as Entry;
    const hash = sign(
      JSON.stringify({
        route,
        method: req.method,
        entry,
        version: input.expectedVersion,
      }),
    );
    if (!/^[a-f0-9-]{36}$/.test(input.requestId || ""))
      return fail("requestIdが不正です。");
    const key = member.id + ":" + input.requestId;
    const cached = data.requests[key];
    if (cached) {
      if (cached.hash !== hash)
        return fail("同じリクエストIDで内容が変更されています。", 409);
      return NextResponse.json({ entry: cached.entry });
    }
    if (existing && !editable(existing, member))
      return fail("他のメンバーの投稿は編集できません。", 403);
    if (existing && existing.version !== input.expectedVersion)
      return fail(
        "他の更新があります。入力をコピーしてからページを再読込し、変更内容を確認してください。",
        409,
      );
    if (
      existing?.status === "published" &&
      entry.status === "draft" &&
      member.role !== "admin"
    )
      return fail("公開済み投稿の非公開化には管理者権限が必要です。", 403);
    if (!["published", "draft"].includes(entry.status))
      return fail("公開状態が不正です。");
    const fields = validateEntry(entry, entry.status === "published", true);
    if (Object.keys(fields).length)
      return fail("入力内容を確認してください。", 422, fields);
    if (
      entry.slug &&
      data.entries.some(
        (e) =>
          e.kind === entry.kind &&
          e.slug === entry.slug &&
          e.id !== existing?.id,
      )
    )
      return fail("このslugはすでに使われています。", 409, {
        slug: "別のslugを指定してください。",
      });
    const now = new Date().toISOString();
    const next: Entry = {
      ...entry,
      id: existing?.id || crypto.randomUUID(),
      clerkUserId: existing?.clerkUserId || member.id,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      publishedAt:
        entry.status === "published"
          ? existing?.publishedAt || now
          : existing?.publishedAt || "",
      version: (existing?.version || 0) + 1,
      embedStatus:
        entry.displayMode === "iframe" && (entry.appUrl.startsWith("/demos/") || (() => { try { return (process.env.NEXT_PUBLIC_EMBED_ORIGINS || "").split(",").includes(new URL(entry.appUrl).origin); } catch { return false; } })())
          ? "allowed"
          : "linkOnly",
    };
    if (existing) data.entries[data.entries.indexOf(existing)] = next;
    else data.entries.unshift(next);
    data.requests[key] = { hash, entry: next };
    await commit();
    return NextResponse.json({ entry: next });
  } catch {
    return fail(
      "保存に失敗しました。入力内容は保持されています。再試行してください。",
      500,
    );
  } finally {
    unlock();
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
