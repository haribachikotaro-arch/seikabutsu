import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { seed } from "@/lib/seed";
import { GROUP_SEEDS, canonicalGroupName, groupNameAliases, slugifyGroup, type GroupProfile } from "@/lib/group-data";
import sanitizeHtml from "sanitize-html";
import { marked } from "marked";
import {
  editable,
  validateEntry,
  imageError,
  type Entry,
  type Member,
} from "@/lib/model";
import { getClerkSession } from "@/lib/clerk-session";
import {
  INVITE_SESSION_COOKIE,
  verifyInviteSessionToken,
} from "@/lib/invite-session";
export const runtime = "nodejs";
const microCmsService = process.env.MICROCMS_SERVICE || "nwh72na5um";
const microCmsKey = process.env.MICROCMS_API_KEY;
const microCmsWorkerUrl = process.env.MICROCMS_WORKER_URL?.replace(/\/$/, "");
const microCmsWorkerToken = process.env.MICROCMS_WORKER_TOKEN;
const workerApiUrl = process.env.WORKER_API_URL?.replace(/\/$/, "");

function requestCookie(req: Request, name: string) {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

function hasInviteSession(req: Request, sessionId: string) {
  return verifyInviteSessionToken(
    requestCookie(req, INVITE_SESSION_COOKIE),
    sessionId,
    process.env.CLERK_SECRET_KEY || "",
  );
}

async function createWorkerAuthHeaders(req: Request, requireUser: boolean) {
  const sharedSecret = process.env.WORKER_SHARED_SECRET;
  if (!sharedSecret) return { error: "Worker shared secret is not configured." } as const;
  const headers: Record<string, string> = {
    Authorization: "Bearer " + sharedSecret,
    "X-Next-Server": "1",
  };
  if (!requireUser) return { headers } as const;

  const session = await getClerkSession(req);
  if (!session) return { error: "Login is required." } as const;
  const { userId, user } = session;
  const email = user?.emailAddresses.find((item) => item.id === user.primaryEmailAddressId) || user?.emailAddresses[0];
  const domain = email?.emailAddress.toLowerCase().split("@").pop() || "";
  const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || "").split(",").map((item) => item.trim().toLowerCase().replace(/^@/, "")).filter(Boolean);
  if (!user || email?.verification?.status !== "verified" || !allowedDomains.includes(domain)) return { error: "A verified school email is required." } as const;
  const role = user.publicMetadata?.role === "admin" ? "admin" : user.publicMetadata?.role === "editor" ? "editor" : "";
  headers["X-User-Id"] = user.id;
  headers["X-User-Name"] = [user.firstName, user.lastName].filter(Boolean).join(" ") || email.emailAddress;
  headers["X-User-Role"] = role;
  headers["X-User-Invite-Verified"] =
    user.publicMetadata?.inviteVerified === true || hasInviteSession(req, session.sessionId)
      ? "true"
      : "false";
  return { headers } as const;
}
async function clerkMember(req: Request): Promise<Member | null> {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return null;
  try {
    const session = await getClerkSession(req);
    if (!session) return null;
    const { userId, user } = session;
    const email = user?.emailAddresses.find((item) => item.id === user.primaryEmailAddressId) || user?.emailAddresses[0];
    const domain = email?.emailAddress.toLowerCase().split("@").pop() || "";
    const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || "").split(",").map((item) => item.trim().toLowerCase().replace(/^@/, "")).filter(Boolean);
    if (!user || email?.verification?.status !== "verified" || !allowedDomains.includes(domain)) return null;
    if (!hasInviteSession(req, session.sessionId)) return null;
    const role = user.publicMetadata?.role === "admin" ? "admin" : "editor";
    return {
      id: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || email.emailAddress,
      role,
    };
  } catch {
    return null;
  }
}
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
function cmsGroup(raw: Record<string, any>, fallback?: GroupProfile): GroupProfile {
  const name = typeof raw.name === "string" ? raw.name : fallback?.name || "";
  const image = typeof raw.image === "string" ? raw.image : raw.image?.url || "";
  const number = (key: string, index: number) => Number(raw[key] ?? raw[`members-grade-${index + 1}`] ?? raw[`grade${index + 1}`] ?? fallback?.membersByGrade[index] ?? 0) || 0;
  return {
    id: raw.id || fallback?.id || "",
    name: canonicalGroupName(name),
    slug: raw.slug || fallback?.slug || slugifyGroup(name),
    catchphrase: raw.catchphrase || raw.oneLine || fallback?.catchphrase || "",
    image: image || fallback?.image || "",
    overview: raw.overview || fallback?.overview || "",
    activities: raw.activities || fallback?.activities || "",
    membersByGrade: [0, 1, 2, 3].map((index) => number(`membersGrade${index + 1}`, index)),
  };
}
async function cmsGroups(): Promise<GroupProfile[]> {
  const rows: Record<string, any>[] = [];
  for (let offset = 0; ; offset += 100) {
    const result = await cmsRequest(`groups?limit=100&offset=${offset}`);
    rows.push(...(result.contents || []));
    if (rows.length >= (result.totalCount || 0) || !result.contents?.length) break;
  }
  return GROUP_SEEDS.map((fallback) => {
    const row = rows.find((item) => groupNameAliases(fallback.name).includes(item.name));
    return cmsGroup(row || {}, fallback);
  });
}
function cmsGroupPayload(input: Record<string, unknown>, fallback?: GroupProfile) {
  const name = String(input.name ?? fallback?.name ?? "").trim();
  if (!name || name.length > 80) throw new Error("グループ名を80文字以内で入力してください。");
  const members = Array.isArray(input.membersByGrade) ? input.membersByGrade : fallback?.membersByGrade || [0, 0, 0, 0];
  const counts = [0, 1, 2, 3].map((index) => Number(members[index] || 0));
  if (counts.some((count) => !Number.isInteger(count) || count < 0 || count > 999)) throw new Error("学年別人数は0〜999の整数で入力してください。");
  const image = String(input.image ?? fallback?.image ?? "").trim();
  if (image && !/^https:\/\//i.test(image) && !image.startsWith("/")) throw new Error("画像URLを確認してください。");
  return {
    name,
    slug: String(input.slug ?? fallback?.slug ?? slugifyGroup(name)).trim().toLowerCase(),
    catchphrase: String(input.catchphrase ?? fallback?.catchphrase ?? "").slice(0, 160),
    image,
    overview: String(input.overview ?? fallback?.overview ?? "").slice(0, 10000),
    activities: String(input.activities ?? fallback?.activities ?? "").slice(0, 10000),
    "members-grade-1": counts[0], "members-grade-2": counts[1], "members-grade-3": counts[2], "members-grade-4": counts[3],
  };
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
    authorName: (typeof raw.member === "object" ? raw.member?.name : null) || member?.name || (typeof raw.member === "string" ? raw.member : null) || "DataDreamers",
    clerkUserId: member?.id || raw.siteAuthorId || "microcms",
    category: (typeof raw.category === "string" ? raw.category : raw.category?.name) || (kind === "works" ? "Webアプリ" : "活動記録"),
    groupName: canonicalGroupName(Array.isArray(raw.groups) ? String(raw.groups[0] || "") : Array.isArray(raw.group) ? String(raw.group[0] || "") : (typeof raw.groups === "object" ? raw.groups?.name : typeof raw.group === "object" ? raw.group?.name : String(raw.groups || raw.group || ""))),
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
async function cmsReferenceId(endpoint: "members" | "categories", name: string) {
  const normalized = name.trim();
  if (!normalized) throw new Error(`${endpoint} の参照名が空です`);
  const findExisting = async () => {
    for (const alias of [normalized]) {
      const query = new URLSearchParams({ filters: `name[equals]${alias}`, limit: "100" });
      const result = await cmsRequest(`${endpoint}?${query.toString()}`);
      const item = (result.contents || []).find((candidate: Record<string, unknown>) => candidate.name === alias);
      if (item) return item;
    }
    return undefined;
  };
  const existing = await findExisting();
  if (existing?.id) return String(existing.id);
  try {
    const created = await cmsRequest(endpoint, { method: "POST", body: JSON.stringify({ name: normalized }) });
    if (created?.id) return String(created.id);
    throw new Error(`microCMS ${endpoint} の作成応答にIDがありません`);
  } catch (error) {
    // A concurrent submission may have created the unique name first.
    const raced = await findExisting().catch(() => null);
    if (raced?.id) return String(raced.id);
    throw error;
  }
}
async function cmsPayload(entry: Entry, clearEmptyGroup = false) {
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
    // microCMS select fields are sent as arrays, even when multiple
    // selection is disabled.
    "backend-type": entry.backendType ? [entry.backendType] : [],
    display: [cmsDisplayValue(entry.displayMode)],
  });
  const [memberId, categoryId] = await Promise.all([
    cmsReferenceId("members", entry.authorName),
    cmsReferenceId("categories", entry.category),
  ]);
  payload.member = memberId;
  payload.category = categoryId;
  if (entry.groupName?.trim()) {
    // Keep the field ID aligned with the current schema.  cmsRequest has a
    // compatibility fallback for installations where the field has not been
    // added to the API yet.
    payload.groups = [canonicalGroupName(entry.groupName.trim())];
  } else if (clearEmptyGroup) {
    payload.groups = [];
  }
  return payload;
}
async function cmsRequest(endpoint: string, init: RequestInit = {}, allowUnknownGroupFallback = true) {
  const workerConfigured = Boolean(microCmsWorkerUrl && microCmsWorkerToken);
  if (microCmsWorkerUrl && !microCmsWorkerToken) throw new Error("MICROCMS_WORKER_TOKEN is required when MICROCMS_WORKER_URL is set");
  const response = await fetch(workerConfigured ? `${microCmsWorkerUrl}/api/v1/${endpoint}` : `https://${microCmsService}.microcms.io/api/v1/${endpoint}`, {
    ...init,
    headers: { ...(workerConfigured ? { Authorization: `Bearer ${microCmsWorkerToken}` } : { "X-MICROCMS-API-KEY": microCmsKey! }), ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    cache: "no-store",
    redirect: "error",
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
      detail = [payload.error, payload.message, ...messages].filter(Boolean).join(" / ");
    } catch { /* Do not expose an unstructured upstream response. */ }

    // Older articles/works APIs may not have the optional `groups` field yet.
    // microCMS rejects unknown keys with a 400.  Retry once without that
    // optional field so the rest of the article can still be saved.  As soon
    // as the field is added to the CMS schema, the first request succeeds and
    // the selected group is persisted normally.
    if (
      allowUnknownGroupFallback &&
      typeof init.body === "string" &&
      /['"]groups['"]\s+is\s+unexpected\s+key/i.test(detail)
    ) {
      try {
        const retryBody = JSON.parse(init.body) as Record<string, unknown>;
        if (Object.prototype.hasOwnProperty.call(retryBody, "groups")) {
          delete retryBody.groups;
          return cmsRequest(
            endpoint,
            { ...init, body: JSON.stringify(retryBody) },
            false,
          );
        }
      } catch {
        // Fall through and report the original CMS error.
      }
    }
    throw new Error(`microCMS ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  if (response.status === 204) return null;
  return response.json();
}
async function cmsPublishDraft(kind: "works" | "articles", id: string) {
  const response = await fetch(
    microCmsWorkerUrl ? `${microCmsWorkerUrl}/management/api/v1/contents/${kind}/${encodeURIComponent(id)}/status` : `https://${microCmsService}.microcms-management.io/api/v1/contents/${kind}/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      headers: { ...(microCmsWorkerUrl ? { Authorization: `Bearer ${microCmsWorkerToken}` } : { "X-MICROCMS-API-KEY": microCmsKey! }), "Content-Type": "application/json" },
      body: JSON.stringify({ status: ["PUBLISH"] }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!response.ok) {
    const responseText = await response.text();
    let detail = "";
    try {
      const payload = JSON.parse(responseText);
      detail = payload.error || payload.message || "";
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
  const commit = async () => { await mkdir("tmp", { recursive: true }); await writeFile("tmp/demo-data.json", JSON.stringify(data, null, 2)); };
  if (route === "public" && req.method === "GET") {
    const [works, articles, groups, news] = await Promise.all([
      cmsEntries("works", data), cmsEntries("articles", data),
      cmsGroups().catch(() => GROUP_SEEDS),
      cmsRequest("news?limit=100&orders=-publishedAt").then((result) => result.contents || []).catch(() => []),
    ]);
    return NextResponse.json({ entries: [...works, ...articles].filter((entry) => entry.status === "published").sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)), allowlist: data.allowlist || [], groups, news });
  }
  if (route === "groups" && req.method === "GET") {
    if (path[1]) {
      const group = (await cmsGroups()).find((item) => item.id === path[1] || item.slug === path[1]);
      return group ? NextResponse.json({ group }) : fail("グループが見つかりません。", 404);
    }
    return NextResponse.json({ groups: await cmsGroups() });
  }
  if (route === "news" && req.method === "GET") {
    const result = await cmsRequest("news?limit=100&orders=-publishedAt");
    return NextResponse.json({ news: result.contents || [] });
  }
  const localMember = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? null : session(req, data);
  const member = localMember || await clerkMember(req);
  if (route === "me" && req.method === "GET") return NextResponse.json({ member });
  if (route === "demo-session" && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
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
  if (path[0] === "groups" && ["POST", "PATCH"].includes(req.method)) {
    const existing = path[1] ? (await cmsGroups()).find((item) => item.id === path[1] || item.slug === path[1]) : undefined;
    if (path[1] && !existing) return fail("グループが見つかりません。", 404);
    const input = await req.json();
    const payload = cmsGroupPayload(input.group || input, existing);
    const result = existing
      ? await cmsRequest(`groups/${encodeURIComponent(existing.id)}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await cmsRequest("groups", { method: "POST", body: JSON.stringify(payload) });
    return NextResponse.json({ group: cmsGroup({ ...payload, ...result }, existing) });
  }
  if (route === "news" && req.method === "POST") {
    const input = await req.json();
    const link = String(input.link || "").trim();
    try { const parsed = new URL(link); if (parsed.protocol !== "https:") throw new Error(); }
    catch { return fail("https:// から始まるリンクを入力してください。", 422, { link: "公開URLを確認してください。" }); }
    const result = await cmsRequest("news", { method: "POST", body: JSON.stringify({ link }) });
    return NextResponse.json({ news: result }, { status: 201 });
  }
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
    if (microCmsWorkerUrl && !microCmsWorkerToken) throw new Error("MICROCMS_WORKER_TOKEN is required when MICROCMS_WORKER_URL is set");
    const mediaResponse = await fetch(microCmsWorkerUrl ? `${microCmsWorkerUrl}/management/api/v1/media` : `https://${microCmsService}.microcms-management.io/api/v1/media`, { method: "POST", headers: microCmsWorkerUrl ? { Authorization: `Bearer ${microCmsWorkerToken}` } : { "X-MICROCMS-API-KEY": microCmsKey! }, body: (() => { const f = new FormData(); f.append("file", new Blob([bytes], { type: file.type }), file.name); return f; })(), redirect: "error", signal: AbortSignal.timeout(20000) });
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
  const body = await cmsPayload(entry, Boolean(existing));
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
    data.cmsAuthors[id] = { id: member.id, name: entry.authorName, role: member.role };
    await commit();
  }
  const savedEntry = cmsEntry({ ...body, ...saved, id, publishedAt: entry.status === "published" ? (existing?.publishedAt || new Date().toISOString()) : existing?.publishedAt }, kind, data.cmsAuthors?.[id] || null);
  savedEntry.authorName = entry.authorName;
  savedEntry.category = entry.category;
  savedEntry.groupName = entry.groupName?.trim() || "";
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
  const cmsConfigured = (microCmsWorkerUrl && microCmsWorkerToken) || microCmsKey;
  if (cmsConfigured && !workerApiUrl) {
    try {
      return await handleMicroCms(req, path, route);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("microCMSの ")) {
        return fail(error.message, 422);
      }
      const detail = error instanceof Error && error.message.startsWith("microCMS ") ? ` (${error.message})` : "";
      return fail(`microCMSとの通信に失敗しました。APIキーの権限とmicroCMSの設定を確認してください。${detail}`, 502);
    }
  }
  if (workerApiUrl) {
    try {
      const upstreamUrl = workerApiUrl;
       const isPublicRead = path[0] === "public" && req.method === "GET";
       const authResult = await createWorkerAuthHeaders(req, !isPublicRead);
      if ("error" in authResult && authResult.error) return fail(authResult.error, 401);
      const contentType = req.headers.get("content-type");
      const upstream = await fetch(
        upstreamUrl + "/api/" + route,
        {
          method: req.method,
          headers: {
            ...authResult.headers,
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
