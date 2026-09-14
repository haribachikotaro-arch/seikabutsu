export type Kind = "works" | "articles";
export type Role = "editor" | "admin";
export type Entry = {
  id: string;
  kind: Kind;
  title: string;
  slug: string;
  description: string;
  content: string;
  eyecatch: string;
  imageAlt: string;
  authorName: string;
  clerkUserId: string;
  category: string;
  techStack: string[];
  appUrl: string;
  repositoryUrl: string;
  demoVideoUrl: string;
  backendType: string;
  displayMode: "iframe" | "linkOnly";
  embedStatus: "allowed" | "linkOnly";
  status: "published" | "draft";
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  version: number;
};
export type Member = { id: string; name: string; role: Role };
export const emptyEntry = (kind: Kind): Entry => ({
  id: "",
  kind,
  title: "",
  slug: "",
  description: "",
  content: "",
  eyecatch: "",
  imageAlt: "",
  authorName: "",
  clerkUserId: "",
  category: kind === "works" ? "Webアプリ" : "活動記録",
  techStack: [],
  appUrl: "",
  repositoryUrl: "",
  demoVideoUrl: "",
  backendType: "なし",
  displayMode: "linkOnly",
  embedStatus: "linkOnly",
  status: "draft",
  createdAt: "",
  updatedAt: "",
  publishedAt: "",
  version: 0,
});
export function publicUrl(value: string): boolean {
  try {
    const u = new URL(value);
    const h = u.hostname.toLowerCase().replace(/\.$/, "");
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      (u.port && u.port !== "443")
    )
      return false;
    if (
      !h.includes(".") ||
      h.includes(":") ||
      /^\[/.test(h) ||
      /^\d+\.\d+\.\d+\.\d+$/.test(h)
    )
      return false;
    return (
      !/(^|\.)(localhost|local|internal|test|invalid|example|onion)$/.test(h) &&
      !h.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}
export function validateEntry(
  data: Entry,
  publish = true,
  demo = false,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [key, max, label] of [
    ["title", 120, "タイトル"],
    ["slug", 100, "slug"],
    ["description", 240, "概要"],
    ["authorName", 80, "投稿者名"],
  ] as const) {
    const value = data[key];
    if (
      typeof value !== "string" ||
      (publish && !value.trim()) ||
      value.length > max
    )
      errors[key] =
        `${label}は${publish ? "1" : "0"}〜${max}文字で入力してください。`;
  }
  if (data.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug))
    errors.slug = "半角小文字・数字・ハイフンで入力してください。";
  if (publish && !data.content?.trim())
    errors.content = "本文を入力してください。";
  if (data.content?.length > 100000)
    errors.content = "本文は100,000文字以下で入力してください。";
  if (publish && !data.eyecatch)
    errors.eyecatch = "アイキャッチ画像を選んでください。";
  if (
    data.eyecatch &&
    !(demo && data.eyecatch.startsWith("/")) &&
    !publicUrl(data.eyecatch)
  )
    errors.eyecatch = "有効な画像URLを指定してください。";
  if (publish && !data.imageAlt?.trim())
    errors.imageAlt = "画像の内容を説明してください。";
  if (!["works", "articles"].includes(data.kind))
    errors.kind = "投稿種別が不正です。";
  if (data.kind === "works") {
    if (data.appUrl) {
      try {
        if (/(^|\.)github\.com$/i.test(new URL(data.appUrl).hostname))
          errors.appUrl = "GitHubのファイル一覧URLではなく、GitHub Pagesで公開されたURLを入力してください（例：https://haribachikotaro-arch.github.io/tetorisu/）。";
      } catch { /* the general URL validation below provides the field error */ }
    }
    if (
      (publish || data.appUrl) &&
      !publicUrl(data.appUrl) &&
      !(demo && data.appUrl.startsWith("/demos/"))
    )
      errors.appUrl =
        "公開先のHTTPS URLを入力してください。ローカル・内部IPは使えません。";
    if (
      !Array.isArray(data.techStack) ||
      data.techStack.length > 10 ||
      (publish && !data.techStack.length) ||
      data.techStack.some(
        (t) => typeof t !== "string" || !t.trim() || t.length > 40,
      )
    )
      errors.techStack = "使用技術を1〜10件、各40文字以下で入力してください。";
    if (!["iframe", "linkOnly"].includes(data.displayMode))
      errors.displayMode = "表示方法を選んでください。";
    if (
      ![
        "なし",
        "必要時だけ動作",
        "常時起動",
        "外部API",
        "ローカル限定",
      ].includes(data.backendType)
    )
      errors.backendType = "バックエンド種別を選んでください。";
  }
  for (const key of ["repositoryUrl", "demoVideoUrl"] as const)
    if (data[key] && !publicUrl(data[key]))
      errors[key] = "有効なHTTPS URLを入力してください。";
  return errors;
}
export function editable(entry: Entry, member: Member) {
  return member.role === "admin" || entry.clerkUserId === member.id;
}
export function imageError(file: { size: number; type: string }) {
  return file.size > 5 * 1024 * 1024
    ? "画像は5MB以下にしてください。"
    : !["image/jpeg", "image/png", "image/webp"].includes(file.type)
      ? "JPG・PNG・WebPの画像を選んでください。"
      : "";
}
