import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { seed } from "@/lib/seed";
import sanitizeHtml from "sanitize-html";
import { marked } from "marked";
import {
  editable,
  validateEntry,
  imageError,
  type Entry,
  type Member,
} from "@/lib/model";
export const runtime = "nodejs";
const microCmsService = process.env.MICROCMS_SERVICE || "nwh72na5um";
const microCmsKey = process.env.MICROCMS_API_KEY;
type Store = {
  entries: Entry[];
  members: Member[];
  allowlist: string[];
  requests: Record<string, { hash: string; entry: Entry }>;
  cmsAuthors?: Record<string, { id: string; name: string; role: "editor" | "admin" }>;
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
    const value = JSON.parse(await readFile("tmp/demo-data.json", "utf8")) as Store;
    value.cmsAuthors ||= {};
    return value;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    return {
      entries: structuredClone(seed),
      members: demoMembers,
      allowlist: (process.env.NEXT_PUBLIC_EMBED_ORIGINS || "").split(",").map((v) => v.trim().replace(/\/$/, "")).filter(Boolean),
      requests: {},
      cmsAuthors: {},
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
function cmsKind(kind: string) {
  return kind === "works" || kind === "articles" ? kind : null;
}
const richHtmlOptions: sanitizeHtml.IOptions = {
  allowedTags: ["h1", "h2", "h3", "h4", "h5", "p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "a", "blockquote", "pre", "code", "figure", "img", "figcaption", "hr"],
  allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt", "width", "height"], figure: ["style"] },
  allowedStyles: { figure: { textAlign: [/^(left|center|right)$/] } },
  allowedSchemes: ["https", "http", "mailto"],
  allowedSchemesByTag: { img: ["https"] },
  allowProtocolRelative: false,
};
function richBody(value: string) {
  const html = /<(p|h[1-5]|figure|img|ul|ol|blockquote|strong|em|br)\b/i.test(value)
    ? value
    : marked.parse(value || "", { async: false });
  return sanitizeHtml(html, richHtmlOptions);
}
function cmsDisplayMode(value: unknown): Entry["displayMode"] {
  const selected = Array.isArray(value) ? value[0] : value;
  return selected === "ページ内で起動 ＋ 別タブ" || selected === "iframe"
    ? "iframe"
    : "linkOnly";
}
function cmsDisplayValue(value: Entry["displayMode"]) {
  return value === "iframe" ? "ページ内で起動 ＋ 別タブ" : "別のタブで開く";
}
function cmsEntry(raw: Record<string, any>, kind: "works" | "articles", member: Member | null = null): Entry {
  const now = new Date().toISOString();
  const publishedAt = raw.publishedAt || "";
  const eyecatch = typeof raw.eyecatch === "string" ? raw.eyecatch : raw.eyecatch?.url || "";
  return {
    id: raw.id,
    kind,
    title: raw.title || "",
    slug: raw.slug || raw.id,
    description: raw.overview || "",
    content: richBody(raw.body || ""),
    eyecatch,
    imageAlt: raw.title || "",
    authorName: member?.name || (typeof raw.member === "string" ? raw.member : raw.member?.name) || "DataDreamers",
    clerkUserId: member?.id || raw.siteAuthorId || "microcms",
    category: (typeof raw.category === "string" ? raw.category : raw.category?.name) || (kind === "works" ? "Webアプリ" : "活動記録"),
    techStack: typeof raw.technology === "string" ? raw.technology.split(/[,、]/).map((x: string) => x.trim()).filter(Boolean) : [],
    appUrl: raw["public-url"] || "",
    repositoryUrl: raw["source-url"] || "",
    demoVideoUrl: raw.movie || "",
    backendType: Array.isArray(raw["backend-type"]) ? (raw["backend-type"][0] || "なし") : (raw["backend-type"] || "なし"),
    displayMode: cmsDisplayMode(raw.display),
    embedStatus: "linkOnly",
    status: publishedAt ? "published" : "draft",
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
    publishedAt,
    version: 1,
  };
}
async function cmsPayload(entry: Entry) {
  const payload: Record<string, unknown> = {
    title: entry.title,
    slug: entry.slug,
    overview: entry.description,
    body: richBody(entry.content),
  };
  if (entry.eyecatch) payload.eyecatch = entry.eyecatch;
  if (entry.kind === "works") Object.assign(payload, {
    technology: entry.techStack.join(", "),
    "public-url": entry.appUrl,
    "source-url": entry.repositoryUrl,
    movie: entry.demoVideoUrl,
    "backend-type": entry.backendType ? [entry.backendType] : [],
    display: [cmsDisplayValue(entry.displayMode)],
  });
  payload.member = entry.authorName;
  payload.category = entry.category;
  return payload;
}
async function cmsRequest(endpoint: string, init: RequestInit = {}) {
  const response = await fetch(`https://${microCmsService}.microcms.io/api/v1/${endpoint}`, {
    ...init,
    headers: { "X-MICROCMS-API-KEY": microCmsKey!, ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const responseText = await response.text();
    let detail = "";
    try {
      const payload = JSON.parse(responseText);
      const messages = Array.isArray(payload.errors)
        ? payload.errors.map((item: { fieldId?: string; message?: string }) => [item.fieldId, item.message].filter(Boolean).join(": ")).filter(Boolean)
        : [];
      detail = [payload.message, ...messages].filter(Boolean).join(" / ");
    } catch { /* Do not expose an unstructured upstream response. */ }
    throw new Error(`microCMS ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  if (response.status === 204) return null;
  return response.json();
}
async function cmsPublishDraft(kind: "works" | "articles", id: string) {
  const response = await fetch(
    `https://${microCmsService}.microcms-management.io/api/v1/contents/${kind}/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      headers: { "X-MICROCMS-API-KEY": microCmsKey!, "Content-Type": "application/json" },
      body: JSON.stringify({ status: ["PUBLISH"] }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!response.ok) {
    const responseText = await response.text();
    let detail = "";
    try {
      const payload = JSON.parse(responseText);
      detail = payload.message || "";
    } catch { /* Keep upstream error details structured. */ }
    throw new Error(`microCMS status ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  if (response.status !== 204) await response.json().catch(() => null);
}
async function cmsEntries(kind: "works" | "articles", data: Store) {
  const contents: Record<string, any>[] = [];
  for (let offset = 0; ; offset += 100) {
    const result = await cmsRequest(`${kind}?limit=100&offset=${offset}&orders=-publishedAt&depth=1`);
    contents.push(...(result.contents || []));
    if (contents.length >= (result.totalCount || 0) || !result.contents?.length) break;
  }
  return contents.map((content) => cmsEntry(content, kind, data.cmsAuthors?.[content.id] || null));
}
async function handleMicroCms(req: NextRequest, path: string[], route: string) {
  const data = await store();
  const member = session(req, data);
  const commit = async () => { await mkdir("tmp", { recursive: true }); await writeFile("tmp/demo-data.json", JSON.stringify(data, null, 2)); };
  if (route === "public" && req.method === "GET") {
    const [works, articles] = await Promise.all([cmsEntries("works", data), cmsEntries("articles", data)]);
    return NextResponse.json({ entries: [...works, ...articles].filter((entry) => entry.status === "published").sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)), allowlist: data.allowlist || [] });
  }
  if (route === "me" && req.method === "GET") return NextResponse.json({ member });
  if (route === "demo-session") {
    if (req.method === "DELETE") { const res = NextResponse.json({ ok: true }); res.cookies.delete("dd-demo"); return res; }
    if (req.method !== "POST") return fail("Method not allowed", 405);
    const { role } = await req.json();
    const selected = data.members.find((m) => m.id === (role === "admin" ? "demo-admin" : "demo-editor"))!;
    const value = selected.id + "." + (Date.now() + 3600000);
    const res = NextResponse.json({ member: selected });
    res.cookies.set("dd-demo", value + "." + sign(value), { httpOnly: true, sameSite: "strict", path: "/", maxAge: 3600 });
    return res;
  }
  if (!member) return fail("ログインが必要です。", 401);
  if (route === "mine" && req.method === "GET") {
    const [works, articles] = await Promise.all([cmsEntries("works", data), cmsEntries("articles", data)]);
    return NextResponse.json({ entries: [...works, ...articles].filter((e) => e.clerkUserId === member.id) });
  }
  if (route === "admin" && req.method === "GET") {
    if (member.role !== "admin") return fail("管理者権限が必要です。", 403);
    const [works, articles] = await Promise.all([cmsEntries("works", data), cmsEntries("articles", data)]);
    return NextResponse.json({ entries: [...works, ...articles], members: data.members, allowlist: data.allowlist || [] });
  }
  if (route === "allowlist" && req.method === "PATCH") {
    if (member.role !== "admin") return fail("管理者権限が必要です。", 403);
    const body = await req.json();
    const origins: string[] = Array.isArray(body.origins) ? body.origins.map((v: unknown) => String(v).trim().replace(/\/$/, "")) : [];
    if (origins.some((v: string) => !/^https:\/\/[^/]+$/.test(v))) return fail("HTTPSのOriginを入力してください。", 422);
    data.allowlist = [...new Set(origins)]; await commit();
    return NextResponse.json({ allowlist: data.allowlist });
  }
  if (route === "media" && req.method === "POST") {
    const form = await req.formData(); const file = form.get("file");
    if (!(file instanceof File)) return fail("画像を選択してください。");
    const error = imageError(file); if (error) return fail(error);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!imageSignature(bytes, file.type)) return fail("画像形式を確認してください。");
    const mediaResponse = await fetch(`https://${microCmsService}.microcms-management.io/api/v1/media`, { method: "POST", headers: { "X-MICROCMS-API-KEY": microCmsKey! }, body: (() => { const f = new FormData(); f.append("file", new Blob([bytes], { type: file.type }), file.name); return f; })(), signal: AbortSignal.timeout(30000) });
    if (!mediaResponse.ok) throw new Error(`microCMS media ${mediaResponse.status}`);
    return NextResponse.json(await mediaResponse.json());
  }
  const kind = cmsKind(path[0]);
  if (!kind) return fail("API not found", 404);
  let existing: Entry | null = null;
  if (path[1]) {
    try { existing = cmsEntry(await cmsRequest(`${kind}/${encodeURIComponent(path[1])}?depth=1`), kind, data.cmsAuthors?.[path[1]] || null); }
    catch { return fail("投稿が見つからないか、microCMS APIキーに下書き取得権限がありません。", 404); }
  }
  if (req.method === "DELETE") {
    if (member.role !== "admin") return fail("投稿の削除は管理者のみ実行できます。", 403);
    if (!existing) return fail("投稿が見つかりません。", 404);
    await cmsRequest(`${kind}/${encodeURIComponent(path[1])}`, { method: "DELETE" });
    return NextResponse.json({ ok: true });
  }
  if (req.method === "GET") {
    if (!existing) return fail("投稿が見つかりません。", 404);
    if (!editable(existing, member)) return fail("他のメンバーの投稿は編集できません。", 403);
    return NextResponse.json({ entry: existing });
  }
  if (!["POST", "PATCH"].includes(req.method)) return fail("Method not allowed", 405);
  if (req.method === "PATCH" && !existing) return fail("投稿が見つかりません。", 404);
  const input = await req.json(); const entry = { ...input.entry, kind } as Entry;
  if (existing && existing.clerkUserId !== "microcms" && !editable(existing, member)) return fail("他のメンバーの投稿は編集できません。", 403);
  if (existing && existing.clerkUserId === "microcms" && member.role !== "admin") return fail("管理者のみ既存のmicroCMS投稿を編集できます。", 403);
  if (!/^[a-f0-9-]{36}$/.test(input.requestId || "")) return fail("requestIdが不正です。");
  if (existing && existing.clerkUserId !== "microcms" && !editable(existing, member)) return fail("他のメンバーの投稿は編集できません。", 403);
  if (!existing && member.role !== "admin") { entry.authorName = member.name; }
  if (!existing) entry.clerkUserId = member.id;
  const fields = validateEntry(entry, entry.status === "published", true);
  if (Object.keys(fields).length) return fail("入力内容を確認してください。", 422, fields);
  const body = await cmsPayload(entry);
  let saved: Record<string, any>;
  if (!existing) {
    try {
      saved = await cmsRequest(`${kind}${entry.status === "draft" ? "?status=draft" : ""}`, { method: "POST", body: JSON.stringify(body) });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Content is already exists")) {
        const matches = await cmsRequest(`${kind}?filters=slug[equals]${encodeURIComponent(entry.slug)}&limit=1&depth=1`);
        const duplicate = matches.contents?.[0] as Record<string, any> | undefined;
        const sameContent = kind === "works"
          ? duplicate?.["public-url"] === entry.appUrl
          : duplicate?.title === entry.title;
        if (member.role === "admin" && duplicate && !duplicate.publishedAt && sameContent) {
          existing = cmsEntry(duplicate, kind, data.cmsAuthors?.[duplicate.id] || null);
          saved = await cmsRequest(`${kind}/${encodeURIComponent(existing.id)}?status=draft`, { method: "PATCH", body: JSON.stringify(body) });
          if (entry.status === "published") await cmsPublishDraft(kind, existing.id);
        } else {
          return fail("このslugはmicroCMSですでに使われています。既存の公開記事を更新する場合は、投稿一覧から編集してください。", 409, { slug: "使用済みのslugです。" });
        }
      } else {
        throw error;
      }
    }
  } else if (entry.status === "published" && existing.status === "draft") {
    saved = await cmsRequest(`${kind}/${encodeURIComponent(existing.id)}?status=draft`, { method: "PATCH", body: JSON.stringify(body) });
    await cmsPublishDraft(kind, existing.id);
  }
  else saved = await cmsRequest(`${kind}/${encodeURIComponent(existing.id)}${entry.status === "draft" ? "?status=draft" : ""}`, { method: "PATCH", body: JSON.stringify(body) });
  const id = saved?.id || existing?.id;
  if (!existing) {
    data.cmsAuthors ||= {};
    data.cmsAuthors[id] = { id: member.id, name: member.name, role: member.role };
    await commit();
  }
  const savedEntry = cmsEntry({ ...body, ...saved, id, publishedAt: entry.status === "published" ? (existing?.publishedAt || new Date().toISOString()) : existing?.publishedAt }, kind, data.cmsAuthors?.[id] || null);
  savedEntry.status = entry.status;
  return NextResponse.json({ entry: savedEntry });
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
  if (microCmsKey && process.env.NODE_ENV === "development" && !process.env.WORKER_API_URL && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    try {
      return await handleMicroCms(req, path, route);
    } catch (error) {
      const detail = error instanceof Error && error.message.startsWith("microCMS ") ? ` (${error.message})` : "";
      return fail(`microCMSとの通信に失敗しました。APIキーの権限とmicroCMSの設定を確認してください。${detail}`, 502);
    }
  }
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
        allowlist: data.allowlist || [],
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
        allowlist: data.allowlist || [],
      });
    }
    if (route === "allowlist" && req.method === "PATCH") {
      if (member.role !== "admin") return fail("管理者権限が必要です。", 403);
      const body = await req.json();
      const origins = Array.isArray(body.origins) ? body.origins : [];
      const normalized: string[] = origins.map((v: unknown) => String(v).trim().replace(/\/$/, ""));
      if (normalized.some((v: string) => !/^https:\/\/[^/]+$/.test(v))) return fail("HTTPSのOrigin（例: https://example.com）だけを登録できます。", 422);
      data.allowlist = [...new Set(normalized)];
      await commit();
      return NextResponse.json({ allowlist: data.allowlist });
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
    if (req.method === "DELETE") {
      if (!existing) return fail("投稿が見つかりません。", 404);
      if (member.role !== "admin") return fail("投稿の削除は管理者のみ実行できます。", 403);
      data.entries.splice(data.entries.indexOf(existing), 1);
      await commit();
      return NextResponse.json({ ok: true });
    }
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
        entry.displayMode === "iframe" && (entry.appUrl.startsWith("/demos/") || (() => { try { return (data.allowlist || []).includes(new URL(entry.appUrl).origin); } catch { return false; } })())
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
