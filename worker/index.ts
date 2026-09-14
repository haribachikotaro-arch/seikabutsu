import { verifyToken, createClerkClient } from "@clerk/backend";
import type { D1Database } from "@cloudflare/workers-types";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import {
  emptyEntry,
  validateEntry,
  imageError,
  publicUrl,
  type Entry,
  type Member,
  type Kind,
} from "../src/lib/model";
export interface Env {
  DB: D1Database;
  SITE_ORIGIN: string;
  CLERK_SECRET_KEY: string;
  CLERK_ISSUER: string;
  SCHOOL_DOMAINS: string;
  JOIN_CODE_SHA256: string;
  MICROCMS_SERVICE: string;
  MICROCMS_API_KEY: string;
  EMBED_ORIGINS: string;
}
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const digest = async (s: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
  )
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
export function safeHtml(markdown: string) {
  return sanitizeHtml(marked.parse(markdown, { async: false }), {
    allowedTags: [
      "p",
      "h2",
      "h3",
      "h4",
      "strong",
      "em",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "blockquote",
      "pre",
      "code",
      "br",
      "hr",
    ],
    allowedAttributes: {
      a: ["href", "title", "rel"],
      img: ["src", "alt", "title"],
    },
    allowedSchemes: ["https"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tag: string, attrs: Record<string, string>): sanitizeHtml.Tag => ({
        tagName: "a",
        attribs: publicUrl(attrs.href || "")
          ? { href: attrs.href, rel: "noopener noreferrer" }
          : {},
      }),
    },
  });
}
async function rate(env: Env, key: string, max = 30) {
  const bucket = Math.floor(Date.now() / 60000);
  const r = await env.DB.prepare(
    "INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
  )
    .bind(key + ":" + bucket, (bucket + 1) * 60000)
    .first<{ count: number }>();
  if (!r || r.count > max)
    throw new ApiError(
      429,
      "操作回数が上限に達しました。1分ほど待ってから再試行してください。",
    );
  await env.DB.prepare("DELETE FROM rate_limits WHERE expires < ?")
    .bind(Date.now() - 60000)
    .run();
}
async function identity(req: Request, env: Env) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!token) throw new ApiError(401, "ログインが必要です。");
  let payload;
  try {
    payload = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
      authorizedParties: [env.SITE_ORIGIN],
    });
    if (
      payload.iss !== env.CLERK_ISSUER ||
      payload.azp !== env.SITE_ORIGIN ||
      !payload.sub
    )
      throw Error();
  } catch {
    throw new ApiError(
      401,
      "セッションが切れています。別タブで再ログインしてから再試行してください。",
    );
  }
  const user = await createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
  }).users.getUser(payload.sub);
  const email = user.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId,
  );
  const domain = email?.emailAddress.toLowerCase().split("@")[1];
  if (
    email?.verification?.status !== "verified" ||
    !domain ||
    !env.SCHOOL_DOMAINS.split(",")
      .map((s) => s.trim().toLowerCase())
      .includes(domain)
  )
    throw new ApiError(
      403,
      "確認済みの学校メールが必要です。学校メールの設定を確認してください。",
    );
  return {
    id: user.id,
    name:
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      "DataDreamers メンバー",
  };
}
async function cms(env: Env, path: string, options: RequestInit = {}) {
  const res = await fetch(
    `https://${env.MICROCMS_SERVICE}.microcms.io/api/v1/${path}`,
    {
      ...options,
      headers: {
        "X-MICROCMS-API-KEY": env.MICROCMS_API_KEY,
        "Content-Type": "application/json",
        ...options.headers,
      },
    },
  );
  if (!res.ok)
    throw new ApiError(
      502,
      "CMSへの保存・取得に失敗しました。入力を保持したまま再試行してください。",
    );
  return (await res.json()) as any;
}
function decode(raw: any, kind: Kind): Entry {
  return {
    ...emptyEntry(kind),
    ...raw,
    kind,
    content: raw.markdown || "",
    eyecatch:
      typeof raw.eyecatch === "string" ? raw.eyecatch : raw.eyecatch?.url || "",
    techStack:
      typeof raw.techStack === "string"
        ? JSON.parse(raw.techStack)
        : raw.techStack || [],
    status: raw.visibility || "draft",
    updatedAt: raw.modifiedAt || raw.updatedAt,
    publishedAt: raw.firstPublishedAt || "",
    version: Number(raw.version),
  };
}
async function getEntry(env: Env, kind: Kind, id: string) {
  const raw = await cms(
    env,
    `${kind}/${encodeURIComponent(id)}?status=published,draft`,
  );
  return decode(raw, kind);
}
async function listEntries(env: Env, where: string, values: unknown[] = []) {
  const result = await env.DB.prepare(
    `SELECT id,kind FROM posts WHERE ${where} ORDER BY updated DESC LIMIT 100`,
  )
    .bind(...values)
    .all<{ id: string; kind: Kind }>();
  return await Promise.all(
    result.results.map((r) => getEntry(env, r.kind, r.id)),
  );
}
async function dispatch(req: Request, env: Env) {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/");
  const route = parts.join("/");
  if (req.method === "GET" && parts[0] === "public") {
    const entries = await listEntries(env, "status='published' AND version>0");
    const visible = entries.filter((e) => e.status === "published");
    if (parts[2]) {
      const entry = visible.find(
        (e) => e.kind === parts[1] && e.slug === parts[2],
      );
      if (!entry) throw new ApiError(404, "投稿が見つかりません。");
      return json({ entry });
    }
    return json({
      entries: parts[1] ? visible.filter((e) => e.kind === parts[1]) : visible,
    });
  }
  const user = await identity(req, env);
  await rate(env, user.id + ":" + parts[0], parts[0] === "join" ? 5 : 30);
  const member = await env.DB.prepare(
    "SELECT id,name,role FROM members WHERE id=?",
  )
    .bind(user.id)
    .first<Member>();
  if (route === "me" && req.method === "GET") return json({ member });
  if (route === "join" && req.method === "POST") {
    if (member) return json({ member });
    const { code } = (await req.json()) as { code: string };
    if (
      typeof code !== "string" ||
      code.length > 256 ||
      (await digest(code)) !== env.JOIN_CODE_SHA256
    )
      throw new ApiError(
        403,
        "参加コードが一致しません。共有されたコードを再確認してください。",
      );
    await env.DB.prepare(
      "INSERT INTO members(id,name,role) VALUES(?,?,'editor') ON CONFLICT(id) DO NOTHING",
    )
      .bind(user.id, user.name)
      .run();
    return json({
      member: await env.DB.prepare(
        "SELECT id,name,role FROM members WHERE id=?",
      )
        .bind(user.id)
        .first(),
    });
  }
  if (!member)
    throw new ApiError(
      403,
      "投稿権限がありません。参加コードを確認してください。",
    );
  if (route === "mine" && req.method === "GET")
    return json({
      entries: await listEntries(env, "owner=? AND version>0", [member.id]),
    });
  if (route === "admin" && req.method === "GET") {
    if (member.role !== "admin")
      throw new ApiError(403, "管理者権限が必要です。");
    return json({
      entries: await listEntries(env, "version>0"),
      members: (await env.DB.prepare("SELECT id,name,role FROM members").all())
        .results,
    });
  }
  if (parts[0] === "members" && req.method === "PATCH") {
    if (member.role !== "admin" || parts[1] === member.id)
      throw new ApiError(403, "この権限は変更できません。");
    const { role } = (await req.json()) as { role: string };
    if (!["editor", "admin"].includes(role))
      throw new ApiError(422, "権限を確認してください。");
    const result = await env.DB.prepare(
      "UPDATE members SET role=? WHERE id=? RETURNING id,name,role",
    )
      .bind(role, parts[1])
      .first();
    if (!result) throw new ApiError(404, "メンバーが見つかりません。");
    return json({ member: result });
  }
  if (route === "media" && req.method === "POST") {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      throw new ApiError(422, "画像を選んでください。");
    const error = imageError(file);
    if (error) throw new ApiError(422, error);
    const b = new Uint8Array(await file.arrayBuffer());
    const valid =
      file.type === "image/jpeg"
        ? b[0] === 255 && b[1] === 216 && b[2] === 255
        : file.type === "image/png"
          ? b.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10"
          : String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
            String.fromCharCode(...b.slice(8, 12)) === "WEBP";
    if (!valid) throw new ApiError(422, "画像の形式と内容が一致しません。");
    const payload = new FormData();
    payload.append("file", file);
    const res = await fetch(
      `https://${env.MICROCMS_SERVICE}.microcms-management.io/api/v1/media`,
      {
        method: "POST",
        headers: { "X-MICROCMS-API-KEY": env.MICROCMS_API_KEY },
        body: payload,
      },
    );
    if (!res.ok)
      throw new ApiError(
        502,
        "画像を保存できませんでした。再試行してください。",
      );
    return json(await res.json());
  }
  if (!["works", "articles"].includes(parts[0]))
    throw new ApiError(404, "APIが見つかりません。");
  const kind = parts[0] as Kind;
  const id = parts[1];
  const index = id
    ? await env.DB.prepare("SELECT * FROM posts WHERE id=? AND kind=?")
        .bind(id, kind)
        .first<{
          id: string;
          owner: string;
          version: number;
          status: string;
          lock_id: string | null;
        }>()
    : null;
  if (id && !index) throw new ApiError(404, "投稿が見つかりません。");
  if (index && index.owner !== member.id && member.role !== "admin")
    throw new ApiError(403, "他のメンバーの投稿は編集できません。");
  if (req.method === "GET" && id)
    return json({ entry: await getEntry(env, kind, id) });
  if (
    !["POST", "PATCH"].includes(req.method) ||
    (req.method === "PATCH" && !id) ||
    (req.method === "POST" && id)
  )
    throw new ApiError(405, "許可されていない操作です。");
  const input = (await req.json()) as {
    entry: Entry;
    requestId: string;
    expectedVersion: number;
  };
  const entry = { ...input.entry, kind };
  if (!["draft", "published"].includes(entry.status))
    throw new ApiError(422, "公開状態が不正です。");
  const fields = validateEntry(entry, entry.status === "published");
  if (Object.keys(fields).length)
    throw new ApiError(422, "入力内容を確認してください。", fields);
  if (
    entry.eyecatch &&
    !entry.eyecatch.startsWith("https://images.microcms-assets.io/")
  )
    throw new ApiError(422, "アップロードした画像を指定してください。", {
      eyecatch: "microCMSへ画像をアップロードしてください。",
    });
  if (
    index?.status === "published" &&
    entry.status === "draft" &&
    member.role !== "admin"
  )
    throw new ApiError(403, "非公開化には管理者権限が必要です。");
  if (!/^[a-f0-9-]{36}$/.test(input.requestId))
    throw new ApiError(422, "requestIdが不正です。");
  const key = member.id + ":" + input.requestId;
  const hash = await digest(
    JSON.stringify({ entry, version: input.expectedVersion, id }),
  );
  const cached = await env.DB.prepare("SELECT * FROM requests WHERE key=?")
    .bind(key)
    .first<{
      hash: string;
      state: string;
      response: string;
      post_id: string;
    }>();
  if (cached) {
    if (cached.hash !== hash)
      throw new ApiError(409, "同じリクエストIDで内容が変更されています。");
    if (cached.state === "done")
      return json({ entry: JSON.parse(cached.response) });
    throw new ApiError(
      409,
      "前の保存結果を確認中です。入力を保持して管理者に確認してください。",
    );
  }
  if (index && (index.version !== input.expectedVersion || index.lock_id))
    throw new ApiError(
      409,
      "他の更新があります。入力をコピーし、再読込してから変更を確認してください。",
    );
  const postId = id || crypto.randomUUID();
  // Retain previous slug reservations so concurrent edits cannot claim the same URL.
  await env.DB.prepare(
    "INSERT INTO slugs(kind,slug,post_id) VALUES(?,?,?) ON CONFLICT(kind,slug) DO NOTHING",
  )
    .bind(kind, entry.slug || postId, postId)
    .run();
  const reservation = await env.DB.prepare(
    "SELECT post_id FROM slugs WHERE kind=? AND slug=?",
  )
    .bind(kind, entry.slug || postId)
    .first<{ post_id: string }>();
  if (reservation?.post_id !== postId)
    throw new ApiError(409, "このslugは使われています。", {
      slug: "別のslugを入力してください。",
    });
  const duplicate = await env.DB.prepare(
    "SELECT id FROM posts WHERE kind=? AND slug=? AND id<>?",
  )
    .bind(kind, entry.slug || postId, postId)
    .first();
  if (duplicate)
    throw new ApiError(409, "このslugは使われています。", {
      slug: "別のslugを入力してください。",
    });
  // Reserve slug and edit version atomically before the external CMS call. Pending requests
  // remain locked on an ambiguous upstream failure; operators reconcile them, never blind-retry.
  try {
    if (index) {
      const result = await env.DB.prepare(
        "UPDATE posts SET lock_id=? WHERE id=? AND version=? AND lock_id IS NULL RETURNING id",
      )
        .bind(key, postId, input.expectedVersion)
        .first();
      if (!result)
        throw new ApiError(409, "他の更新があります。再読込してください。");
      await env.DB.prepare(
        "INSERT INTO requests(key,hash,post_id,created) VALUES(?,?,?,?)",
      )
        .bind(key, hash, postId, Date.now())
        .run();
    } else
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO posts(id,kind,slug,owner,updated,lock_id) VALUES(?,?,?,?,?,?)",
        ).bind(
          postId,
          kind,
          entry.slug || postId,
          member.id,
          new Date().toISOString(),
          key,
        ),
        env.DB.prepare(
          "INSERT INTO requests(key,hash,post_id,created) VALUES(?,?,?,?)",
        ).bind(key, hash, postId, Date.now()),
      ]);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      409,
      "同じslugまたはリクエストで保存処理中です。内容を確認してください。",
      { slug: "別のslugか、保存処理の完了を確認してください。" },
    );
  }
  const previous = index ? await getEntry(env, kind, postId) : null;
  const now = new Date().toISOString();
  const allowed =
    entry.displayMode === "iframe" &&
    env.EMBED_ORIGINS.split(",").includes(
      new URL(entry.appUrl || "https://invalid.invalid").origin,
    );
  const next: Entry = {
    ...entry,
    id: postId,
    clerkUserId: index?.owner || member.id,
    createdAt: previous?.createdAt || now,
    updatedAt: now,
    publishedAt:
      entry.status === "published"
        ? previous?.publishedAt || now
        : previous?.publishedAt || "",
    version: (index?.version || 0) + 1,
    embedStatus: allowed ? "allowed" : "linkOnly",
  };
  const {
    id: _id,
    kind: _kind,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    publishedAt: _publishedAt,
    status: _status,
    ...body
  } = next;
  // Native CMS documents stay readable by the server. 'visibility' is the publication gate;
  // the API key is Worker-only and every public response also checks the D1 publication index.
  await cms(env, `${kind}/${postId}`, {
    method: index ? "PATCH" : "PUT",
    body: JSON.stringify({
      ...body,
      content: safeHtml(next.content),
      markdown: next.content,
      techStack: JSON.stringify(next.techStack),
      visibility: next.status,
      modifiedAt: now,
      firstPublishedAt: next.publishedAt,
    }),
  });
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE posts SET slug=?,version=?,status=?,updated=?,lock_id=NULL WHERE id=? AND lock_id=?",
    ).bind(next.slug || postId, next.version, next.status, now, postId, key),
    env.DB.prepare(
      "UPDATE requests SET state='done',response=? WHERE key=?",
    ).bind(JSON.stringify(next), key),
  ]);
  return json({ entry: next });
}
const worker = {
  async fetch(req: Request, env: Env) {
    const origin = req.headers.get("Origin");
    if (origin && origin !== env.SITE_ORIGIN)
      return json({ message: "利用元が一致しません。" }, 403);
    if (!["GET", "OPTIONS"].includes(req.method) && origin !== env.SITE_ORIGIN)
      return json({ message: "利用元が必要です。" }, 403);
    const headers = {
      "Access-Control-Allow-Origin": env.SITE_ORIGIN,
      Vary: "Origin",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Authorization,Content-Type",
      "X-Content-Type-Options": "nosniff",
    };
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    let response: Response;
    try {
      if (Number(req.headers.get("Content-Length") || 0) > 6 * 1024 * 1024)
        throw new ApiError(413, "送信データが大きすぎます。");
      response = await dispatch(req, env);
    } catch (e) {
      response =
        e instanceof ApiError
          ? json({ message: e.message, fields: e.fields }, e.status)
          : json(
              {
                message:
                  "処理に失敗しました。入力内容を保持して再試行してください。",
              },
              500,
            );
    }
    for (const [k, v] of Object.entries(headers)) response.headers.set(k, v);
    return response;
  },
};
export default worker;
