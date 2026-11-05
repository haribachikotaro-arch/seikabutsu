"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Entry } from "@/lib/model";
import { GROUP_SEEDS, type GroupProfile } from "@/lib/group-data";
import existingNews from "@/lib/official-news.json";

type RequestFn = (path: string, options?: RequestInit) => Promise<any>;

export function GroupPages({ groups, entries, path }: { groups: GroupProfile[]; entries: Entry[]; path?: string }) {
  const group = groups.find((item) => item.slug === path || item.id === path);
  if (!path) return <GroupDirectory groups={groups} />;
  if (!group) return <div className="empty"><h1>グループが見つかりません</h1><Link href="/groups">グループ一覧へ →</Link></div>;
  const related = entries.filter((entry) => entry.groupName === group.name);
  const works = related.filter((entry) => entry.kind === "works");
  const articles = related.filter((entry) => entry.kind === "articles");
  const memberTotal = group.membersByGrade.reduce((sum, count) => sum + count, 0);
  return <article className="group-detail">
    <div className="group-detail-grid">
      <aside className="group-side-nav"><strong>{group.name}</strong><a href="#overview">グループ概要</a><a href="#activities">活動内容</a><a href="#members">メンバー</a><a href="#posts">活動記事・成果物</a></aside>
      <div className="group-detail-main">
        <div className="group-breadcrumb"><Link href="/groups">グループ一覧</Link><span>/</span>{group.name}</div>
        <header className="group-hero"><img src={group.image || "/images/official/skill.png"} alt={group.name} /><div><span className="eyebrow">DATADREAMERS GROUP</span><h1>{group.name}</h1><p>{group.catchphrase}</p></div></header>
        <section id="overview" className="group-section"><h2>グループ概要</h2><p>{group.overview}</p></section>
        <section id="activities" className="group-section"><h2>現在の活動</h2><p>{group.activities}</p></section>
        <section id="members" className="group-section"><h2>メンバー</h2><p className="group-member-total">合計 <strong>{memberTotal}</strong> 名</p><div className="grade-grid">{group.membersByGrade.map((count, index) => <div key={index}><span>{index + 1}年生</span><strong>{count}</strong><small>名</small></div>)}</div></section>
        <section id="posts" className="group-section"><h2>このグループの活動記事・成果物</h2>
          {related.length ? <div className="group-post-grid">{[...articles, ...works].map((entry) => <Link className="group-post-card" key={entry.kind + entry.id} href={`/${entry.kind}/${entry.slug}`}><span>{entry.kind === "works" ? "成果物" : "活動記事"}</span><strong>{entry.title}</strong><small>{entry.description}</small></Link>)}</div> : <p>このグループに紐づく公開記事・成果物はまだありません。</p>}
        </section>
      </div>
    </div>
  </article>;
}

function GroupDirectory({ groups }: { groups: GroupProfile[] }) {
  return <section className="groups-directory"><div className="group-directory-intro"><span className="eyebrow">OUR GROUPS</span><h1>グループ紹介</h1><p>関心のあるテーマから、DataDreamersの活動を見つけてください。</p></div>
    <div className="group-directory-grid">{groups.map((group) => <Link className="group-directory-card" key={group.slug} href={`/groups/${group.slug}`}><div className="group-card-image"><img src={group.image || "/images/official/skill.png"} alt="" loading="lazy" /><span>↗</span></div><div><h2>{group.name}</h2><p>{group.catchphrase}</p></div></Link>)}</div>
  </section>;
}

export function GroupManager({ request }: { request: RequestFn }) {
  const [groups, setGroups] = useState<GroupProfile[]>(GROUP_SEEDS);
  const [selected, setSelected] = useState<GroupProfile>(GROUP_SEEDS[0]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { void request("groups").then((data) => { if (data.groups?.length) { setGroups(data.groups); setSelected(data.groups[0]); } }).catch((error) => setMessage(error.message)); }, [request]);
  function update(key: keyof GroupProfile, value: string | number[]) { setSelected((current) => ({ ...current, [key]: value })); }
  async function upload(file?: File) {
    if (!file) return;
    const form = new FormData(); form.append("file", file);
    setBusy(true);
    try { const data = await request("media", { method: "POST", body: form }); update("image", data.url); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setMessage("");
    try {
      const data = await request(`groups${selected.id ? `/${selected.id}` : ""}`, { method: selected.id ? "PATCH" : "POST", body: JSON.stringify({ group: selected }) });
      const saved = data.group as GroupProfile;
      setGroups((items) => [...items.filter((item) => item.slug !== saved.slug), saved]); setSelected(saved); setMessage("グループ紹介を保存しました。");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  async function registerInitialGroups() {
    setBusy(true); setMessage("");
    try {
      const current = [...groups];
      for (const item of current.filter((group) => !group.id)) {
        const data = await request("groups", { method: "POST", body: JSON.stringify({ group: item }) });
        const saved = data.group as GroupProfile;
        const index = current.findIndex((group) => group.slug === item.slug);
        if (index >= 0) current[index] = saved;
      }
      setGroups(current); setSelected(current.find((group) => group.slug === selected.slug) || current[0]); setMessage("初期6グループをCMSに登録しました。");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="group-manager"><div className="studio-heading"><div><div className="eyebrow">CMS CONTENT</div><h1>グループ紹介の編集</h1></div></div>
    {message && <p className="notice" role="status">{message}</p>}
    {groups.some((group) => !group.id) && <div className="notice group-register-note"><p>初期6グループをCMSの参照先として登録できます。紹介フィールドをgroups APIに追加してから実行してください。</p><button className="button" disabled={busy} onClick={() => void registerInitialGroups()}>初期6グループをCMSに登録</button></div>}
    <label className="field"><span>編集するグループ</span><select value={selected.slug} onChange={(event) => setSelected(groups.find((group) => group.slug === event.target.value) || GROUP_SEEDS[0])}>{groups.map((group) => <option key={group.slug} value={group.slug}>{group.name}</option>)}</select></label>
    <label className="field"><span>グループ名</span><input value={selected.name} onChange={(event) => update("name", event.target.value)} /></label>
    <label className="field"><span>ページID（英数字・ハイフン）</span><input value={selected.slug} onChange={(event) => update("slug", event.target.value)} /></label>
    <label className="field"><span>一言紹介</span><input value={selected.catchphrase} onChange={(event) => update("catchphrase", event.target.value)} /></label>
    <label className="field"><span>紹介画像</span><input type="file" accept="image/*" onChange={(event) => void upload(event.target.files?.[0])} />{selected.image && <img className="group-manager-image" src={selected.image} alt="現在の紹介画像" />}</label>
    <label className="field"><span>グループ概要</span><textarea rows={4} value={selected.overview} onChange={(event) => update("overview", event.target.value)} /></label>
    <label className="field"><span>現在の活動</span><textarea rows={5} value={selected.activities} onChange={(event) => update("activities", event.target.value)} /></label>
    <fieldset className="grade-editor"><legend>学年別メンバー数</legend>{selected.membersByGrade.map((count, index) => <label key={index}>{index + 1}年生<input type="number" min="0" max="999" value={count} onChange={(event) => update("membersByGrade", selected.membersByGrade.map((value, i) => i === index ? Number(event.target.value) : value))} /></label>)}</fieldset>
    <button className="button primary" disabled={busy} onClick={() => void save()}>{busy ? "保存中…" : "紹介内容を保存"}</button>
  </section>;
}

export function NewsPage({ items }: { items: Record<string, any>[] }) {
  const cmsItems: { link: string; text: string; key: string; createdAt?: string }[] = items.map((item) => ({ ...item, link: String(item.link || ""), text: item.title || item.text || item.link || "", key: item.id || item.link || "" }));
  const known = new Set(cmsItems.map((item) => item.link));
  const archive: typeof cmsItems = (existingNews as { url: string; text: string }[]).filter((item) => !known.has(item.url)).map((item) => ({ link: item.url, text: item.text, key: item.url }));
  const news = [...cmsItems, ...archive];
  return <section className="cms-news-page"><span className="eyebrow">NEWS</span><h1>お知らせ</h1><p>DataDreamersからのお知らせです。</p>{news.length ? <div>{news.map((item) => <a className="official-news" key={item.key} href={item.link} target="_blank" rel="noopener noreferrer"><span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("ja-JP") : ""}</span><strong>{item.text}</strong><span>↗</span></a>)}</div> : <p className="empty">現在、お知らせはありません。</p>}</section>;
}

export function NewsEditor({ request }: { request: RequestFn }) {
  const [link, setLink] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setMessage(""); try { await request("news", { method: "POST", body: JSON.stringify({ link }) }); setLink(""); setMessage("お知らせを投稿しました。"); } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); } }
  return <form className="news-editor" onSubmit={(event) => void submit(event)}><div className="studio-heading"><div><div className="eyebrow">NEWS</div><h1>お知らせを投稿</h1></div></div><label className="field"><span>お知らせのリンク</span><input type="url" required value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://example.com/news" /></label><p className="hint">現在のmicroCMS「news」APIにはリンク欄が設定されています。</p>{message && <p className="notice" role="status">{message}</p>}<button className="button primary" disabled={busy}>{busy ? "投稿中…" : "お知らせを投稿"}</button></form>;
}
