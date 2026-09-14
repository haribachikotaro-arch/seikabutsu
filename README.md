# DataDreamers

学生の制作物を主役にした公開サイトと、メンバー専用の投稿スタジオです。
既存の投稿フォームで使っていた項目・プレビュー・iframe起動を、Next.js / TypeScriptへ移しました。元のHTML・JS・CSSは `legacy/` に保存しています。

## 起動

Node.js 22.13以降で、次のコマンドを実行してください。

```sh
npm ci
npm run dev
```

http://127.0.0.1:3000 を開きます。ルートの `index.html` は従来の静的プロトタイプです。新しいサイトの起点は `src/app/` です。

接続設定なしの開発環境ではサンプルデータで動作します。「メンバーログイン」から投稿者・管理者のローカル検証を選べます。下書き・公開・編集・権限変更は `tmp/demo-data.json` に保存され、画像は `public/uploads/` に保存されます。ログインCookieは署名付き・HttpOnly・SameSite Strict、有効期限は1時間です。秘密値は `tmp/demo-secret` に保存します。

これは実アカウントの認証ではありません。`next start` ではデモログイン・書き込みを拒否します。ローカルサーバーは127.0.0.1にのみバインドします。サンプル作品・記事は実際の活動実績ではなく、画面上にもその旨を表示しています。

## 画面

| URL | 内容 |
| --- | --- |
| `/` | 大きな作品展示＋活動記録、ほかの作品、団体紹介 |
| `/works`、`/works/:slug` | 検索・カテゴリ、成果物詳細、操作後だけ読み込むiframe |
| `/articles`、`/articles/:slug` | 記事一覧・検索、読み物としての詳細 |
| `/about` | DataDreamersの紹介 |
| `/login`、`/register` | ログイン・登録。接続時はClerkを利用 |
| `/studio` | 自分の投稿と公開状態、新規作成 |
| `/studio/new/works`、`/studio/new/articles` | 投稿・下書き保存・プレビュー・即時公開 |
| `/studio/edit/:kind/:id` | 既存投稿の編集 |
| `/admin` | 全投稿・非公開化・ロール変更 |

公開済みの投稿を下書きへ戻せるのは管理者だけです。編集者は自分の公開済み投稿を編集して再公開できます。失敗した入力は編集画面内に保持され、公開成功時には公開ページへのリンクが出ます。長文本文はMarkdownで編集し、見出し・太字・箇条書き・リンクの挿入ボタンと画像の逐次アップロードを利用できます。プレビューと詳細はReact Markdownで表示し、生HTMLは実行しません。

## 本番接続

この作業では外部アカウントの認証情報が提供されていないため、Clerk・Workers・D1・microCMSを実サービスへ接続・デプロイしていません。接続用コードを同梱していますが、実サービスの結合試験は必要です。

1. `.env.example` を `.env.local` にコピーし、Clerkの公開鍵・秘密鍵、WorkersのURL、サイトの正確なOriginを設定します。microCMS APIキーはNext.jsへ設定しません。
2. Clerkでメール＋パスワード登録、メールOTP確認を有効にし、登録可能な学校メールドメインを制限します。OAuth等の別の認証経路を有効にしないでください。Workersでも確認済みのプライマリ学校メールを毎回検証します。学校ドメインは要件書では未決です。
3. `npx wrangler d1 create datadreamers` でD1を作成し、`wrangler.jsonc` のdatabase_idを実値に変更します。`npx wrangler d1 execute datadreamers --remote --file worker/schema.sql` でテーブルを作成します。
4. `wrangler.jsonc` の `SITE_ORIGIN`、`CLERK_ISSUER`、`MICROCMS_SERVICE`、`EMBED_ORIGINS` を設定します。`EMBED_ORIGINS` はカンマ区切りの正確なHTTPS Originです。Next.jsの `NEXT_PUBLIC_EMBED_ORIGINS` に同じ値を設定します。未指定時、外部作品は別タブのみです。
5. Workers Secretsへ `CLERK_SECRET_KEY`、`MICROCMS_API_KEY`、`SCHOOL_DOMAINS`、`JOIN_CODE_SHA256` を設定します。参加コードそのものではなくSHA-256ハッシュを設定します。ログに参加コードを出さないでください。
6. 下記のmicroCMSスキーマを作成します。Content APIのGET・PUT・PATCHとManagement APIの画像アップロードを許可したキーをWorkersだけに設定します。
7. 最初の管理者は、学校メール確認と参加コードによる登録後、D1の `members` で対象のClerk IDだけを `admin` に更新してください。以後の権限変更は管理画面を利用できます。自分自身の権限変更は拒否します。
8. 本番用ClerkのFrontend API Originが公開キーから導出できない場合は `CLERK_FRONTEND_ORIGIN` を明示します。ステージング環境でOTP・登録・保存・画像・非公開・期限切れ・CSPを確認してから公開してください。

Workersをローカルで接続確認する場合は `.dev.vars` にSecretsを書き、`npx wrangler d1 execute datadreamers --local --file worker/schema.sql`、`npm run worker:dev` を利用します。`.dev.vars`、`.env.local` はコミットしません。

## microCMSスキーマ

リスト形式API `articles` と `works` を作成し、以下のカスタムフィールドを両方に設定します。下書きを許すため、CMS側の必須設定ではなくWorkersが公開時に必須検査します。

| フィールド | microCMS型 | 用途 |
| --- | --- | --- |
| title / slug / description / authorName | テキスト | 基本情報 |
| clerkUserId / category / imageAlt | テキスト | 投稿者ID、分類、代替テキスト |
| eyecatch | テキスト | Management APIでアップロードした画像URL |
| content | リッチエディタ | Workersが許可リストで安全化したHTML |
| markdown | テキストエリア | 再編集用のMarkdownソース |
| techStack | テキストエリア | JSON配列文字列 |
| appUrl / repositoryUrl / demoVideoUrl | テキスト | 外部URL |
| backendType / displayMode / embedStatus | テキスト | 動作条件と埋め込み許可 |
| visibility | テキスト | `published` / `draft` |
| modifiedAt / firstPublishedAt | テキスト | ISO日時。未公開時のfirstPublishedAtは空文字 |
| version | 数字 | 楽観的ロック用バージョン |

**公開状態の実装上の判断:** CMSのネイティブな公開状態とは別に `visibility` とD1の `posts.status` を使用しています。CMS内のデータはサーバーが読み取れる状態で保存し、一般公開APIは両方がpublishedのものだけを返します。CMSキーを第三者に共有すると下書きにもアクセスできるため、必ずWorkers限定にしてください。CMS管理画面での直接編集・公開切替はD1と同期しません。運用上の編集は投稿スタジオを利用してください。

D1にはメンバー権限、公開インデックス、レート制限、二重実行防止と編集ロックを保存します。slugは競合防止のため履歴を含め予約し、他の投稿に再利用しません。現在の一覧取得上限は100件で、画面は6件ずつ追加表示します。100件を超える運用ではAPIのページング拡張が必要です。

## 障害時

- 保存失敗時は入力を残します。同一内容の再送には同じrequestIdを使用し、内容を変更した場合は新しいrequestIdになります。
- WorkersとCMSをまたぐ保存が途中で失敗すると、D1の `requests.state=pending` と `posts.lock_id` を残します。不明な結果を無条件に再実行しない設計です。管理者は対象の `post_id` のCMSデータとversionを確認し、完了していればD1の公開状態・version・応答を整合させ、未保存であることを確認できれば予約を解除して再試行します。自動復旧は未実装です。
- レート制限はユーザー・APIごとに1分30回、参加コードは1分5回です。D1の古いレート記録はリクエスト時に削除します。二重実行記録は自動削除せず、保持期間を決めて運用してください。
- 外部iframeの描画成功はブラウザーから確実には判定できません。loadイベントだけで成功とは表示せず、10秒後に別タブ利用を案内します。説明と外部リンクは常に残ります。
- 本文入力は通信失敗中も画面に残りますが、未保存でタブを閉じると失われます。閉じる前に警告し、セッション切れ時は別タブでログインできます。

## 開発と検証

```sh
npm run typecheck
npm run lint
npm test
npm run build
# devサーバー起動中、ローカルChromeを使用
npm run test:ui
```

`tests/core.test.ts` は内部URL・危険なスキーム・権限・画像サイズ・本文安全化を検証します。`scripts/check-ui.mjs` はPC/スマートフォン、検索、遅延iframe、必須項目、下書き永続化、公開・非公開化を検証します。テスト投稿は「検証用の記事」として作成され、完了後に非公開になります。スクリーンショットは `tmp/screenshots/` です。

`src/lib/model.ts` に共有データ型と入力検査、`src/lib/seed.ts` にサンプル、`src/components/site.tsx` に画面、`src/app/globals.css` にデザイン、`src/app/api/[...path]/route.ts` にローカルAPIとWorkersへの代理処理、`worker/` に外部接続用APIがあります。SVGの画面イメージと操作できるサンプルは `scripts/create-assets.mjs` から再生成できます。

参照: [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)、[Clerkトークン検証](https://clerk.com/docs/reference/backend/verify-token)、[microCMS Content API](https://document.microcms.io/content-api/introduction)、[microCMS画像アップロード](https://document.microcms.io/management-api/post-media)。
