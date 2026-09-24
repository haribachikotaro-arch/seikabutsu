"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { SignIn, SignUp, useAuth, UserButton } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";
import { seed } from "@/lib/seed";
import {
  type Entry,
  type Member,
  type Kind,
  emptyEntry,
  validateEntry,
  imageError,
} from "@/lib/model";
type RequestFn = (path: string, options?: RequestInit) => Promise<any>;
const date = (s: string) =>
  s
    ? new Date(s)
        .toLocaleDateString("ja-JP", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .replaceAll("/", ".")
    : "—";
const arrow = <span aria-hidden="true">↗</span>;
function canEmbed(entry: Entry) {
  if (entry.displayMode !== "iframe" || !entry.appUrl) return false;
  if (entry.appUrl.startsWith("/demos/")) return true;
  try {
    const origins = (process.env.NEXT_PUBLIC_EMBED_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter(Boolean);
    return origins.includes(new URL(entry.appUrl).origin);
  } catch {
    return false;
  }
}
function Mark() {
  return (
    <img className="mark" src="/favicon.png" alt="" aria-hidden="true" />
  );
}
function Cover({
  entry,
  className = "",
}: {
  entry: Entry;
  className?: string;
}) {
  return (
    <img
      className={"cover " + className}
      src={entry.eyecatch || "/images/field-notes.svg"}
      alt={entry.imageAlt || entry.title}
    />
  );
}
function Tags({ entry }: { entry: Entry }) {
  return (
    <div className="tech">
      {entry.techStack.map((t) => (
        <span key={t}>{t}</span>
      ))}
    </div>
  );
}
export default function Site(props: {
  path: string[];
  demo: boolean;
  localWrite: boolean;
}) {
  return props.demo ? <Workspace {...props} /> : <Connected {...props} />;
}
function Connected(props: {
  path: string[];
  demo: boolean;
  localWrite: boolean;
}) {
  const { getToken, isSignedIn } = useAuth();
  return <Workspace {...props} token={getToken} signedIn={!!isSignedIn} />;
}
function Workspace({
  path,
  demo,
  localWrite,
  token,
  signedIn,
}: {
  path: string[];
  demo: boolean;
  localWrite: boolean;
  token?: () => Promise<string | null>;
  signedIn?: boolean;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>(demo ? seed : []);
  const [member, setMember] = useState<Member | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!demo);
  const request: RequestFn = useCallback(
    async (url, options = {}) => {
      const jwt = token ? await token() : null;
      const res = await fetch("/api/" + url, {
        ...options,
        headers: {
          ...(options.body instanceof FormData
            ? {}
            : { "Content-Type": "application/json" }),
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
          ...options.headers,
        },
      });
      const data = await res.json();
      if (!res.ok)
        throw Object.assign(
          new Error(
            data.message ||
              "通信に失敗しました。時間をおいて再試行してください。",
          ),
          { fields: data.fields, status: res.status },
        );
      return data;
    },
    [token],
  );
  const refresh = useCallback(async () => {
    try {
      const result = await request("public");
      setEntries(result.entries);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [request]);
  useEffect(() => {
    void refresh();
    void request("me")
      .then((d) => setMember(d.member))
      .catch(() => setMember(null));
  }, [refresh, request, signedIn]);
  const section = path[0] || "home";
  const privatePage = ["studio", "admin"].includes(section);
  const published = entries.filter((e) => e.status === "published");
  async function enter(role: "editor" | "admin") {
    try {
      const result = await request("demo-session", {
        method: "POST",
        body: JSON.stringify({ role }),
      });
      setMember(result.member);
      router.push("/studio");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <a className="skip" href="#main">
        本文へ移動
      </a>
      <div className="site-header"><header className="header wrap">
        <Link className="brand" href="/" aria-label="DataDreamers トップページ">
          <Mark />
          <span>
            DataDreamers<small>学生の制作と、活動の記録</small>
          </span>
        </Link>
        <nav aria-label="メインナビゲーション">
          <Link
            aria-current={section === "works" ? "page" : undefined}
            href="/works"
          >
            成果物
          </Link>
          <Link
            aria-current={section === "articles" ? "page" : undefined}
            href="/articles"
          >
            活動記事
          </Link>
          <Link
            aria-current={section === "about" ? "page" : undefined}
            href="/about"
          >
            私たちについて
          </Link>
        </nav>
        <Link className="studio-link" href={member ? "/studio" : "/login"}>
          {member ? "投稿スタジオ" : "メンバーログイン"} <span>↗</span>
        </Link>
        {!demo && signedIn && <UserButton />}
      </header></div>
      <main id="main" className={"wrap " + (privatePage ? "workspace" : "")}>
        {demo && (
          <div className="sample-note">
            <span className="dot" /> サンプルデータで表示しています{" "}
            <span className="sample-extra">
              — 実際の活動・制作実績ではありません
            </span>
          </div>
        )}
        {error && (
          <div role="alert" className="notice error">
            {error} <button onClick={() => void refresh()}>再試行</button>
          </div>
        )}
        {loading ? (
          <p className="empty" role="status">
            読み込んでいます…
          </p>
        ) : section === "home" ? (
          <Home entries={published} />
        ) : section === "about" ? (
          <About />
        ) : section === "works" || section === "articles" ? (
          path[1] ? (
            <Detail
              entry={published.find(
                (e) => e.kind === section && e.slug === path[1],
              )}
            />
          ) : (
            <Listing
              kind={section}
              entries={published.filter((e) => e.kind === section)}
            />
          )
        ) : section === "login" || section === "register" ? (
          <div className="auth-page">
            <div className="eyebrow">DataDreamers メンバー専用</div>
            <h1>
              {section === "login"
                ? "制作の続きを、ここから。"
                : "DataDreamersに参加する"}
            </h1>
            <p>記事や作品を投稿し、制作の過程を残しましょう。</p>
            {demo ? (
              <>
                <div className="auth-note">
                  {localWrite
                    ? "ローカル動作確認用です。実際のアカウント登録・公開は行いません。"
                    : "認証サービスの接続準備中です。"}
                </div>
                {localWrite && (
                  <div className="auth-actions">
                    <button
                      className="button primary"
                      onClick={() => void enter("editor")}
                    >
                      投稿者として試す →
                    </button>
                    <button
                      className="button"
                      onClick={() => void enter("admin")}
                    >
                      管理者として試す
                    </button>
                  </div>
                )}
              </>
            ) : section === "login" ? (
              <SignIn
                routing="hash"
                signUpUrl="/register"
                forceRedirectUrl="/studio"
              />
            ) : (
              <>
                <ol className="registration-steps">
                  <li>学校メール・パスワードを登録</li>
                  <li>メールの確認コードで本人確認</li>
                  <li>投稿スタジオで参加コードを入力</li>
                </ol>
                <SignUp
                  routing="hash"
                  signInUrl="/login"
                  forceRedirectUrl="/studio"
                />
              </>
            )}
            <p>
              <Link href={section === "login" ? "/register" : "/login"}>
                {section === "login" ? "新規登録はこちら" : "ログインへ戻る"} →
              </Link>
            </p>
          </div>
        ) : privatePage ? (
          <>
            {!member ? (
              <JoinOrLogin
                signedIn={signedIn}
                request={request}
                onJoin={setMember}
              />
            ) : (
              <>
                <div className="workspace-nav">
                  <Link
                    href="/studio"
                    aria-current={section === "studio" ? "page" : undefined}
                  >
                    投稿スタジオ
                  </Link>
                  {member.role === "admin" && (
                    <Link
                      href="/admin"
                      aria-current={section === "admin" ? "page" : undefined}
                    >
                      管理画面
                    </Link>
                  )}
                  <span>
                    {member.name} ·{" "}
                    {member.role === "admin" ? "管理者" : "投稿者"}
                  </span>
                  {demo && (
                    <button
                      onClick={async () => {
                        await request("demo-session", { method: "DELETE" });
                        setMember(null);
                        router.push("/");
                      }}
                    >
                      ログアウト
                    </button>
                  )}
                </div>
                {section === "admin" && member.role !== "admin" ? (
                  <p className="empty">管理者権限が必要です。</p>
                ) : path[1] === "new" || path[1] === "edit" ? (
                  <Editor
                    key={path.join("/")}
                    kind={path[2] === "articles" ? "articles" : "works"}
                    id={path[1] === "edit" ? path[3] : undefined}
                    member={member}
                    request={request}
                    demo={demo}
                    refresh={refresh}
                  />
                ) : (
                  <Studio
                    member={member}
                    request={request}
                    admin={section === "admin"}
                    refresh={refresh}
                  />
                )}
              </>
            )}
          </>
        ) : (
          <div className="empty">
            <h1>ページが見つかりません。</h1>
            <Link href="/">トップページへ →</Link>
          </div>
        )}
      </main>
      <div className="site-footer"><footer className="footer wrap">
        <div className="footer-top">
          <Link className="brand footer-brand" href="/"><Mark />Data Dreamers</Link>
          <nav className="footer-links" aria-label="フッターナビゲーション">
            <div><Link href="/about">About</Link><Link href="/about">私たちについて</Link><Link href="/works">成果物</Link></div>
            <div><Link href="/articles">Activities</Link><Link href="/articles">活動記事</Link><Link href="/studio">投稿スタジオ</Link></div>
            <div><a href="https://data-dreamers.vercel.app/for-new-dreamers">New Students</a><Link href="/login">メンバーログイン</Link></div>
          </nav>
        </div>
        <div className="footer-bottom">© {new Date().getFullYear()} Data Dreamers. All Rights Reserved.</div>
      </footer></div>
    </>
  );
}
function Home({ entries }: { entries: Entry[] }) {
  const works = entries.filter((e) => e.kind === "works");
  const articles = entries.filter((e) => e.kind === "articles");
  const featured = works[0];
  return (
    <>
      <div className="intro">
        <h1>学生がつくったものと、その過程。</h1>
        <p>
          アイデアを動くかたちに。DataDreamersの制作と活動を公開しています。
        </p>
      </div>
      <div className="front-grid">
        <section className="featured">
          <div className="section-line">
            <h2>いま、つくっているもの</h2>
            <span>制作物ピックアップ</span>
          </div>
          {featured ? (
            <>
              <Link className="featured-image" href={"/works/" + featured.slug}>
                <Cover entry={featured} />
                <span className="image-link">作品を見てみる {arrow}</span>
              </Link>
              <div className="feature-caption">
                <div>
                  <div className="eyebrow">
                    {featured.category}{" "}
                    <span>／ {date(featured.publishedAt)}</span>
                  </div>
                  <Link href={"/works/" + featured.slug}>
                    <h2>{featured.title}</h2>
                  </Link>
                  <p>{featured.description}</p>
                  <Tags entry={featured} />
                </div>
                <Link
                  className="round-arrow"
                  href={"/works/" + featured.slug}
                  aria-label={featured.title + "の詳細"}
                >
                  ↗
                </Link>
              </div>
            </>
          ) : (
            <p className="empty">公開された作品は、こちらに掲載します。</p>
          )}
        </section>
        <aside className="recent">
          <div className="section-line">
            <h2>最近の活動</h2>
            <Link href="/articles" aria-label="活動記事をすべて見る">
              すべて見る ↗
            </Link>
          </div>
          {articles.slice(0, 3).map((e, i) => (
            <Link
              className={"recent-item " + (i === 0 ? "lead-article" : "")}
              key={e.id}
              href={"/articles/" + e.slug}
            >
              {i === 0 && <Cover entry={e} />}
              <div className="meta">
                {date(e.publishedAt)}
                <span>{e.category}</span>
              </div>
              <h3>{e.title}</h3>
              {i === 0 && <p>{e.description}</p>}
              <span className="read-arrow">↗</span>
            </Link>
          ))}
          <div className="small-about">
            <span className="dot" />
            <p>
              授業の先を、つくって学ぶ。
              <br />
              学生ITコミュニティ、DataDreamers。
            </p>
            <Link href="/about">私たちについて ↗</Link>
          </div>
        </aside>
      </div>
      {works.length > 1 && (
        <section className="more-works">
          <div className="section-line">
            <h2>ほかにも、こんな作品</h2>
            <Link href="/works">成果物をすべて見る ↗</Link>
          </div>
          <div className="work-grid">
            {works.slice(1, 3).map((e) => (
              <WorkItem key={e.id} entry={e} />
            ))}
          </div>
        </section>
      )}
      <section className="bottom-about">
        <span className="eyebrow">DataDreamersについて</span>
        <h2>
          「つくってみたい」を、
          <br />
          ひとりで終わらせない。
        </h2>
        <div>
          <p>
            Webアプリ、ゲーム、身近な課題を解決するツール。
            <br />
            それぞれの興味を持ち寄って、手を動かす学生チームです。
            <br />
            完成した作品だけでなく、試行錯誤も残していきます。
          </p>
          <Link href="/about">私たちの活動を知る ↗</Link>
        </div>
      </section>
    </>
  );
}
function WorkItem({ entry: e }: { entry: Entry }) {
  return (
    <article className="work-item">
      <Link href={"/works/" + e.slug}>
        <Cover entry={e} />
      </Link>
      <div className="eyebrow">
        {e.category}
        <span>{date(e.publishedAt)}</span>
      </div>
      <Link href={"/works/" + e.slug}>
        <h2>
          {e.title}
          <span>↗</span>
        </h2>
      </Link>
      <p>{e.description}</p>
      <Tags entry={e} />
      <p className="author">制作：{e.authorName}</p>
    </article>
  );
}
function Listing({ kind, entries }: { kind: Kind; entries: Entry[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("すべて");
  const [limit, setLimit] = useState(6);
  const filtered = entries.filter(
    (e) =>
      (category === "すべて" || e.category === category) &&
      [e.title, e.description, ...e.techStack]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">
          DataDreamersの{kind === "works" ? "制作物" : "記録"}
        </div>
        <h1>{kind === "works" ? "つくったもの。" : "つくる日々の、記録。"}</h1>
        <p>
          {kind === "works"
            ? "アプリも、ゲームも、小さな実験も。気になる作品を、実際に触ってみてください。"
            : "うまくいったことも、つまずいたことも。学生メンバーの活動を綴ります。"}
        </p>
      </div>
      <div className="filter-bar">
        <div className="filter-tabs" aria-label="カテゴリで絞り込み">
          {["すべて", ...new Set(entries.map((e) => e.category))].map((c) => (
            <button
              key={c}
              aria-pressed={c === category}
              onClick={() => {
                setCategory(c);
                setLimit(6);
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="search">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label={kind === "works" ? "作品・技術を検索" : "記事を検索"}
            placeholder={kind === "works" ? "作品・技術を検索" : "記事を検索"}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(6);
            }}
          />
        </label>
      </div>
      {filtered.length === 0 ? (
        <p className="empty">
          該当する{kind === "works" ? "成果物" : "記事"}
          がありません。検索条件を変えてみてください。
        </p>
      ) : kind === "works" ? (
        <div className="work-grid listing">
          {filtered.slice(0, limit).map((e) => (
            <WorkItem key={e.id} entry={e} />
          ))}
        </div>
      ) : (
        <div className="article-list">
          {filtered.slice(0, limit).map((e, i) => (
            <article
              key={e.id}
              className={i === 0 ? "article-row first" : "article-row"}
            >
              <Link href={"/articles/" + e.slug}>
                <Cover entry={e} />
              </Link>
              <div>
                <div className="meta">
                  {date(e.publishedAt)}
                  <span>{e.category}</span>
                </div>
                <Link href={"/articles/" + e.slug}>
                  <h2>{e.title} ↗</h2>
                </Link>
                <p>{e.description}</p>
                <span className="author">{e.authorName}</span>
              </div>
            </article>
          ))}
        </div>
      )}
      {limit < filtered.length && (
        <button
          className="button load-more"
          onClick={() => setLimit((l) => l + 6)}
        >
          もっと見る ↓
        </button>
      )}
    </>
  );
}
function Detail({
  entry: e,
  preview = false,
}: {
  entry?: Entry;
  preview?: boolean;
}) {
  if (!e)
    return (
      <div className="empty">
        <h1>投稿が見つかりません。</h1>
        <p>非公開になったか、URLが変更された可能性があります。</p>
        <Link href="/">トップページに戻る →</Link>
      </div>
    );
  return (
    <article className={"detail " + (e.kind === "articles" ? "reading" : "")}>
      <div className="breadcrumb">
        {!preview && (
          <Link href={"/" + e.kind}>
            {e.kind === "works" ? "成果物" : "活動記事"}一覧
          </Link>
        )}
        <span>／ {e.category}</span>
        {preview && <strong>公開前のプレビュー</strong>}
      </div>
      <div className="detail-heading">
        <div className="meta">
          {date(e.publishedAt)}
          <span>{e.category}</span>
        </div>
        <h1>{e.title || "タイトル未入力"}</h1>
        <p>{e.description}</p>
        <p className="author">
          {e.kind === "works" ? "制作" : "文"}：{e.authorName}
        </p>
      </div>
      <Cover entry={e} />
      {e.kind === "works" && (
        <div className="detail-meta">
          <Tags entry={e} />
          <span>バックエンド：{e.backendType}</span>
          {e.repositoryUrl && (
            <a href={e.repositoryUrl} target="_blank" rel="noopener noreferrer">
              GitHub ↗
            </a>
          )}
          {e.demoVideoUrl && (
            <a href={e.demoVideoUrl} target="_blank" rel="noopener noreferrer">
              デモ動画 ↗
            </a>
          )}
        </div>
      )}
      <div className="prose">
        <ReactMarkdown>{e.content}</ReactMarkdown>
      </div>
      {e.kind === "works" && e.appUrl && <Launch entry={e} />}
    </article>
  );
}
function Launch({ entry: e }: { entry: Entry }) {
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");
  const [frameHeight, setFrameHeight] = useState(560);
  const [frameZoom, setFrameZoom] = useState(100);
  const [frameFullscreen, setFrameFullscreen] = useState(false);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(
      () =>
        setMessage(
          "画面が表示されない場合、埋め込み制限またはアプリ停止の可能性があります。別のタブでお試しください。",
        ),
      10000,
    );
    return () => clearTimeout(timer);
  }, [active]);
  return (
    <section className="launch">
      <div className="section-line">
        <h2>実際に、触ってみる。</h2>
        <span>
          {e.backendType === "ローカル限定"
            ? "ローカル環境が必要です"
            : "作品の実験台"}
        </span>
      </div>
      <p>外部アプリの稼働状況によっては、表示に時間がかかることがあります。</p>
      <div className="actions">
        {canEmbed(e) && (
          <button
            className="button primary"
            onClick={() => {
              setActive(!active);
              setMessage(
                "読み込んでいます。表示されない場合は別タブで開いてください。",
              );
            }}
          >
            {active ? "画面を閉じる ×" : "このページで開く ↗"}
          </button>
        )}
        <a
          className="button"
          href={e.appUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          別のタブで開く ↗
        </a>
      </div>
      {active && (
        <>
          <div className="embed-controls" aria-label="起動画面の表示設定">
            <label className="embed-slider">表示領域 <input type="range" min="360" max="1200" step="10" value={frameHeight} onChange={event=>setFrameHeight(Number(event.target.value))} aria-label="表示領域の高さ"/><output>{frameHeight}px</output></label>
            <span className="embed-divider" aria-hidden="true" />
            <label className="embed-slider">拡大率 <input type="range" min="50" max="150" step="1" value={frameZoom} onChange={event=>setFrameZoom(Number(event.target.value))} aria-label="ゲーム画面の拡大率"/><output>{frameZoom}%</output></label>
            <button
              type="button"
              className="fullscreen-button"
              onClick={async () => {
                const frame =
                  document.querySelector<HTMLIFrameElement>(".launch iframe");
                if (!frame) return;
                if (document.fullscreenElement) await document.exitFullscreen();
                else await frame.requestFullscreen();
                setFrameFullscreen(!document.fullscreenElement);
              }}
            >
              {frameFullscreen ? "全画面を閉じる" : "全画面で表示"} ⛶
            </button>
          </div>
          <p role="status" className="hint">
            {message}
          </p>
          <iframe
            src={e.appUrl}
            title={e.title + "の実行画面"}
            sandbox={canEmbed(e)
              ? "allow-scripts allow-forms allow-popups allow-downloads allow-same-origin"
              : "allow-scripts allow-forms allow-popups"}
            allowFullScreen
            referrerPolicy="no-referrer"
            style={{ height: `${frameHeight}px`, width: `${10000 / frameZoom}%`, transform: `scale(${frameZoom / 100})`, transformOrigin: "top left" }}
            onLoad={() =>
              setMessage(
                "画面が表示されない場合は、別のタブで開いてください。表示サイズ・拡大率を調整できます。",
              )
            }
            onError={() =>
              setMessage("読み込みに失敗しました。別のタブでお試しください。")
            }
          />
        </>
      )}
    </section>
  );
}
function About() {
  return (
    <section className="about-page">
      <div className="eyebrow">学生ITコミュニティ</div>
      <h1>DataDreamersについて</h1>
      <h2>
        身近な「こうだったら」を、
        <br />
        自分たちの手で。
      </h2>
      <p>
        DataDreamersは、Webアプリやゲーム、Webサイトなどを制作する学生ITコミュニティ・開発チームです。
      </p>
      <p>
        自分の興味を出発点に、試作品をつくり、仲間に触ってもらう。そこで見つけた課題を持ち帰り、また直す。制作を通じて学んだことを、このサイトで公開していきます。
      </p>
      <div className="about-links">
        <Link href="/works">学生がつくった成果物を見る ↗</Link>
        <Link href="/articles">制作の過程・活動記事を読む ↗</Link>
      </div>
      <h3>メンバーの方へ</h3>
      <p>
        活動の記録や制作した作品は、投稿スタジオから登録できます。公開した内容は、そのままサイトに掲載されます。
      </p>
      <Link className="button" href="/studio">
        投稿スタジオへ →
      </Link>
    </section>
  );
}
function JoinOrLogin({
  signedIn,
  request,
  onJoin,
}: {
  signedIn?: boolean;
  request: RequestFn;
  onJoin: (m: Member) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="auth-page">
      <h1>{signedIn ? "参加コードを確認" : "メンバーログイン"}</h1>
      {signedIn ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const result = await request("join", {
                method: "POST",
                body: JSON.stringify({ code }),
              });
              setCode("");
              onJoin(result.member);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            学校メールの確認後、共有されたDataDreamers参加コードを入力してください。
          </p>
          <label>
            参加コード
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoComplete="off"
            />
          </label>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "確認中…" : "参加して投稿スタジオへ →"}
          </button>
        </form>
      ) : (
        <>
          <p>投稿・編集には、DataDreamersのメンバー認証が必要です。</p>
          <Link className="button primary" href="/login">
            ログインする →
          </Link>
          <p>
            <Link href="/register">初めての方は新規登録 ↗</Link>
          </p>
        </>
      )}
    </section>
  );
}
function Studio({
  member,
  request,
  admin,
  refresh,
}: {
  member: Member;
  request: RequestFn;
  admin: boolean;
  refresh: () => Promise<void>;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("posts");
  const load = useCallback(
    () =>
      request(admin ? "admin" : "mine")
        .then((d) => {
          setEntries(d.entries);
          setMembers(d.members || []);
        })
        .catch((e) => setMessage(e.message)),
    [request, admin],
  );
  useEffect(() => {
    void load();
  }, [load]);
  async function unpublish(e: Entry) {
    if (
      !confirm(
        `「${e.title}」を非公開にしますか？公開サイトから閲覧できなくなります。`,
      )
    )
      return;
    setBusy(true);
    try {
      await request(e.kind + "/" + e.id, {
        method: "PATCH",
        body: JSON.stringify({
          entry: { ...e, status: "draft" },
          requestId: crypto.randomUUID(),
          expectedVersion: e.version,
        }),
      });
      setMessage("非公開にしました。");
      await load();
      await refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="studio-heading">
        <div>
          <div className="eyebrow">
            {admin ? "DataDreamers 管理者" : "制作と活動を公開する"}
          </div>
          <h1>{admin ? "投稿とメンバーの管理" : "投稿スタジオ"}</h1>
        </div>
        <div className="actions">
          <Link className="button" href="/studio/new/articles">
            ＋ 新しい記事を書く
          </Link>
          <Link className="button primary" href="/studio/new/works">
            ＋ 成果物を投稿する
          </Link>
        </div>
      </div>
      {admin && (
        <div className="filter-tabs">
          <button
            aria-pressed={tab === "posts"}
            onClick={() => setTab("posts")}
          >
            投稿管理
          </button>
          <button
            aria-pressed={tab === "members"}
            onClick={() => setTab("members")}
          >
            権限管理
          </button>
        </div>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {tab === "members" ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>メンバー</th>
                <th>権限</th>
                <th>変更</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.role}</td>
                  <td>
                    {m.id === member.id ? (
                      "自分の権限は変更できません"
                    ) : (
                      <button
                        disabled={busy}
                        onClick={async () => {
                          const role = m.role === "admin" ? "editor" : "admin";
                          if (!confirm(`${m.name}を${role}に変更しますか？`))
                            return;
                          setBusy(true);
                          try {
                            await request("members/" + m.id, {
                              method: "PATCH",
                              body: JSON.stringify({ role }),
                            });
                            await load();
                            setMessage("権限を更新しました。");
                          } catch (e) {
                            setMessage((e as Error).message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        {m.role === "admin" ? "投稿者に変更" : "管理者に変更"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="filter-bar">
            <div className="filter-tabs">
              {[
                ["all", "すべて"],
                ["published", "公開中"],
                ["draft", "下書き・非公開"],
              ].map(([v, label]) => (
                <button
                  key={v}
                  aria-pressed={filter === v}
                  onClick={() => setFilter(v)}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              className="table-search"
              aria-label="投稿を検索"
              placeholder="タイトルを検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {(["works", "articles"] as Kind[]).map((kind) => (
            <section className="studio-table" key={kind}>
              <h2>
                {admin ? "すべての" : "自分の"}
                {kind === "works" ? "成果物" : "記事"}
              </h2>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>タイトル</th>
                      {admin && <th>投稿者</th>}
                      <th>公開状態</th>
                      <th>公開日</th>
                      <th>更新日</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries
                      .filter(
                        (e) =>
                          e.kind === kind &&
                          (filter === "all" || e.status === filter) &&
                          e.title.includes(query),
                      )
                      .map((e) => (
                        <tr key={e.id}>
                          <td>
                            {e.status === "published" ? (
                              <Link href={"/" + kind + "/" + e.slug}>
                                {e.title || "無題"}
                              </Link>
                            ) : (
                              e.title || "無題"
                            )}
                          </td>
                          {admin && <td>{e.authorName}</td>}
                          <td>
                            <span className={"status " + e.status}>
                              {e.status === "published"
                                ? "● 公開中"
                                : "○ 下書き・非公開"}
                            </span>
                          </td>
                          <td>{date(e.publishedAt)}</td>
                          <td>{date(e.updatedAt)}</td>
                          <td>
                            <div className="table-actions">
                              <Link href={"/studio/edit/" + kind + "/" + e.id}>
                                編集 ↗
                              </Link>
                              {admin && e.status === "published" && (
                                <button
                                  disabled={busy}
                                  onClick={() => void unpublish(e)}
                                >
                                  非公開
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!entries.some(
                  (e) =>
                    e.kind === kind &&
                    (filter === "all" || e.status === filter) &&
                    e.title.includes(query),
                ) && (
                  <p className="empty">
                    該当する{kind === "works" ? "成果物" : "記事"}はありません。
                  </p>
                )}
              </div>
            </section>
          ))}
        </>
      )}
    </>
  );
}
function Editor({
  kind,
  id,
  member,
  request,
  demo,
  refresh,
}: {
  kind: Kind;
  id?: string;
  member: Member;
  request: RequestFn;
  demo: boolean;
  refresh: () => Promise<void>;
}) {
  const [entry, setEntry] = useState<Entry>({
    ...emptyEntry(kind),
    authorName: member.name,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [loaded, setLoaded] = useState(!id);
  const [saved, setSaved] = useState(false);
  const [section, setSection] = useState("basic");
  const [requestId, setRequestId] = useState("");
  useEffect(() => {
    if (id)
      void request(kind + "/" + id)
        .then((d) => {
          setEntry(d.entry);
          setLoaded(true);
        })
        .catch((e) => setMessage(e.message));
  }, [id, kind, request]);
  useEffect(() => {
    if (!saved) {
      const warn = (e: BeforeUnloadEvent) => {
        if (entry.title || entry.content) e.preventDefault();
      };
      window.addEventListener("beforeunload", warn);
      return () => window.removeEventListener("beforeunload", warn);
    }
  }, [entry, saved]);
  function change(key: keyof Entry, value: any) {
    setEntry((e) => ({ ...e, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
    setSaved(false);
    setRequestId("");
    setMessage("");
  }
  async function upload(file: File | undefined, inline = false) {
    if (!file) return;
    const error = imageError(file);
    if (error) {
      setErrors((e) => ({ ...e, [inline ? "content" : "eyecatch"]: error }));
      return;
    }
    setBusy(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const result = await request("media", { method: "POST", body: data });
      if (inline)
        change(
          "content",
          entry.content + `\n\n![画像の説明を入力](${result.url})\n`,
        );
      else change("eyecatch", result.url);
    } catch (e) {
      setErrors((v) => ({
        ...v,
        [inline ? "content" : "eyecatch"]: (e as Error).message,
      }));
    } finally {
      setBusy(false);
    }
  }
  async function save(publish: boolean) {
    const next = {
      ...entry,
      status: publish ? ("published" as const) : ("draft" as const),
    };
    const fields = validateEntry(next, publish, demo);
    setErrors(fields);
    if (Object.keys(fields).length) {
      setSection("all");
      setMessage("入力内容を確認してください。該当欄に理由を表示しています。");
      return;
    }
    setBusy(true);
    const rid = requestId || crypto.randomUUID();
    setRequestId(rid);
    try {
      const result = await request(kind + (entry.id ? "/" + entry.id : ""), {
        method: entry.id ? "PATCH" : "POST",
        body: JSON.stringify({
          entry: next,
          expectedVersion: entry.version,
          requestId: rid,
        }),
      });
      setEntry(result.entry);
      setSaved(true);
      setRequestId("");
      setMessage(publish ? "公開しました。" : "下書きを保存しました。");
      await refresh();
    } catch (e) {
      const err = e as Error & { fields?: Record<string, string> };
      setMessage(err.message);
      if (err.fields) {
        setErrors(err.fields);
        setSection("all");
      }
    } finally {
      setBusy(false);
    }
  }
  const field = (
    key: keyof Entry,
    label: string,
    required = false,
    max?: number,
    type = "text",
  ) => (
    <label className="field" key={key} htmlFor={"field-" + key}>
      <span>
        {label}
        {required && <small>必須</small>}
        {max && (
          <em>
            {String(entry[key]).length} / {max}
          </em>
        )}
      </span>
      {type === "textarea" ? (
        <textarea
          id={"field-" + key}
          value={String(entry[key])}
          rows={key === "content" ? 16 : 3}
          maxLength={max}
          onChange={(e) => change(key, e.target.value)}
          aria-invalid={!!errors[key]}
          aria-describedby={"help-" + key}
        />
      ) : (
        <input
          id={"field-" + key}
          value={String(entry[key])}
          type={type}
          maxLength={max}
          onChange={(e) => change(key, e.target.value)}
          aria-invalid={!!errors[key]}
          aria-describedby={"help-" + key}
        />
      )}
      <span id={"help-" + key} className={errors[key] ? "field-error" : "hint"}>
        {errors[key] ||
          (key === "slug"
            ? "半角小文字・数字・ハイフン。公開ページのURLに使います。"
            : key === "appUrl"
              ? "https:// から始まる公開URL"
              : "")}
      </span>
    </label>
  );
  if (!loaded)
    return (
      <p role="status" className="empty">
        {message || "投稿を読み込んでいます…"}
      </p>
    );
  return (
    <>
      <div className="studio-heading">
        <div>
          <Link className="back-link" href="/studio">
            ← 投稿一覧
          </Link>
          <h1>
            {kind === "works" ? "成果物" : "記事"}を{entry.id ? "編集" : "投稿"}
          </h1>
        </div>
        <span className={"status " + entry.status}>
          {entry.status === "published" ? "● 公開中" : "○ 下書き"}
        </span>
      </div>
      <p className="editor-intro">
        {kind === "works"
          ? "つくったものと、その工夫を伝えましょう。"
          : "活動で気づいたこと、学んだことを記録しましょう。"}{" "}
        公開すると、すぐにサイトへ掲載されます。
      </p>
      <div className="editor-layout">
        <aside className="editor-sections">
          {[
            ["basic", "基本情報"],
            ["content", "紹介内容"],
            ...(kind === "works" ? [["tech", "技術情報"]] : []),
            ["settings", "公開設定"],
            ["all", "すべて表示"],
          ].map(([v, label]) => (
            <button
              key={v}
              aria-pressed={section === v}
              onClick={() => setSection(v)}
            >
              {label}
              <span>→</span>
            </button>
          ))}
          <p>
            下書きは非公開です。
            <br />
            プレビューで確認してから
            <br />
            公開してください。
          </p>
        </aside>
        <div className="editor-body">
          <fieldset disabled={busy}>
            {(section === "basic" || section === "all") && (
              <section>
                <h2>基本情報</h2>
                {field(
                  "title",
                  kind === "works" ? "作品名" : "タイトル",
                  true,
                  120,
                )}
                {field("slug", "slug", true, 100)}
                {field("description", "短い概要", true, 240, "textarea")}
                {field(
                  "authorName",
                  kind === "works" ? "制作者名" : "投稿者名",
                  true,
                  80,
                )}
                {field("category", "カテゴリ", false, 40)}
              </section>
            )}
            {(section === "content" || section === "all") && (
              <section>
                <h2>紹介内容</h2>
                <div className="field">
                  <label htmlFor="eyecatch">
                    アイキャッチ <small>必須</small>
                  </label>
                  <input
                    id="eyecatch"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => void upload(e.target.files?.[0])}
                  />
                  <p className="hint">
                    JPG / PNG / WebP、5MB以下。1枚ずつアップロードします。
                  </p>
                  {entry.eyecatch && (
                    <img
                      className="upload-preview"
                      src={entry.eyecatch}
                      alt={entry.imageAlt || "アップロードした画像"}
                    />
                  )}
                  <p className="field-error">{errors.eyecatch}</p>
                  {demo && !entry.eyecatch && (
                    <button
                      className="text-button"
                      onClick={() =>
                        change("eyecatch", "/images/field-notes.svg")
                      }
                    >
                      サンプル画像を使う
                    </button>
                  )}
                </div>
                {field("imageAlt", "画像の説明（代替テキスト）", true, 160)}
                <div className="format-bar">
                  <span>本文の書式</span>
                  {[
                    ["見出し", "\n## 見出し\n"],
                    ["太字", "**強調する言葉**"],
                    ["箇条書き", "\n- 項目\n"],
                    ["リンク", "[リンクの名前](https://)"],
                  ].map(([label, text]) => (
                    <button
                      key={label}
                      onClick={() => change("content", entry.content + text)}
                    >
                      {label}
                    </button>
                  ))}
                  <label className="inline-upload">
                    画像を挿入
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => void upload(e.target.files?.[0], true)}
                    />
                  </label>
                </div>
                {field("content", "本文", true, 100000, "textarea")}
                <p className="hint">
                  Markdownで記述できます。「プレビュー」で見出し・太字・リンク・画像を確認できます。
                </p>
              </section>
            )}
            {kind === "works" && (section === "tech" || section === "all") && (
              <section>
                <h2>技術情報</h2>
                <label className="field">
                  <span>
                    使用技術 <small>必須</small>
                  </span>
                  <input
                    value={entry.techStack.join(", ")}
                    onChange={(e) =>
                      change(
                        "techStack",
                        e.target.value.split(",").map((v) => v.trim()),
                      )
                    }
                  />
                  <span className={errors.techStack ? "field-error" : "hint"}>
                    {errors.techStack ||
                      "カンマ区切りで最大10件。例：Next.js, TypeScript"}
                  </span>
                </label>
                <label className="field">
                  <span>バックエンド種別</span>
                  <select
                    value={entry.backendType}
                    onChange={(e) => change("backendType", e.target.value)}
                  >
                    {[
                      "なし",
                      "必要時だけ動作",
                      "常時起動",
                      "外部API",
                      "ローカル限定",
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                {field(
                  "repositoryUrl",
                  "GitHubなどのソースコードURL",
                  false,
                  2000,
                  "url",
                )}
                {field("demoVideoUrl", "デモ動画URL", false, 2000, "url")}
              </section>
            )}
            {(section === "settings" || section === "all") && (
              <section>
                <h2>公開設定</h2>
                {kind === "works" && (
                  <>
                    {field("appUrl", "公開アプリURL", true, 2000, "url")}
                    <label className="field">
                      <span>作品の表示方法</span>
                      <select
                        value={entry.displayMode}
                        onChange={(e) => change("displayMode", e.target.value)}
                      >
                        <option value="linkOnly">別のタブで開く</option>
                        <option value="iframe">ページ内で起動 ＋ 別タブ</option>
                      </select>
                      <span className="hint">
                        ページ内表示は、管理者が許可した公開先に限ります。
                      </span>
                    </label>
                  </>
                )}
                <p>
                  「公開する」を押すと、一般閲覧者が読める状態になります。管理者の承認待ちはありません。
                </p>
                <p>
                  非公開のまま作業を続ける場合は「下書き保存」を選んでください。
                </p>
              </section>
            )}
          </fieldset>
          <div className="editor-actions">
            <button
              className="button"
              disabled={busy}
              onClick={() => void save(false)}
            >
              下書き保存
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => setPreview(!preview)}
            >
              {preview ? "プレビューを閉じる" : "プレビュー"}
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void save(true)}
            >
              {busy ? "処理中…" : "公開する ↗"}
            </button>
          </div>
          {message && (
            <div
              role="status"
              className={"notice " + (saved ? "success" : "error")}
            >
              {message}
              {saved && entry.status === "published" && (
                <Link href={"/" + kind + "/" + entry.slug}>
                  {" "}
                  公開ページを見る ↗
                </Link>
              )}
              {!saved && message.includes("ログイン") && (
                <Link href="/login" target="_blank">
                  {" "}
                  別タブで再ログイン ↗
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
      {preview && (
        <div className="preview-panel">
          <Detail entry={entry} preview />
        </div>
      )}
    </>
  );
}
