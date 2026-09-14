import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
mkdirSync("tmp/screenshots", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:3000/");
await page
  .getByRole("heading", { name: "学生がつくったものと、その過程。" })
  .waitFor();
await page.screenshot({
  path: "tmp/screenshots/home-desktop.png",
  fullPage: true,
});
await page.getByRole("link", { name: "成果物", exact: true }).click();
await page.getByRole("textbox", { name: "作品・技術を検索" }).fill("タイマー");
await page.getByRole("heading", { name: "ひと区切りタイマー" }).waitFor();
assert.equal(await page.locator(".work-item").count(), 1);
await page.getByRole("link", { name: "ひと区切りタイマー ↗" }).click();
assert.equal(await page.locator("iframe").count(), 0);
await page.getByRole("button", { name: "この作品を起動する" }).click();
await page.locator("iframe").waitFor();
assert.equal(
  await page.locator("iframe").getAttribute("sandbox"),
  "allow-scripts allow-forms allow-popups",
);
await page.getByRole("button", { name: "画面を閉じる" }).click();
assert.equal(await page.locator("iframe").count(), 0);
await page.goto("http://127.0.0.1:3000/login");
await page.getByRole("button", { name: "投稿者として試す" }).click();
await page
  .getByRole("heading", { name: "投稿スタジオ", exact: true })
  .waitFor();
await page.getByRole("link", { name: "新しい記事を書く" }).click();
await page.getByRole("button", { name: "公開する" }).click();
await page
  .getByText("入力内容を確認してください。該当欄に理由を表示しています。")
  .waitFor();
const slug = "qa-" + Date.now();
await page.locator("#field-title").fill("検証用の記事");
await page.locator("#field-slug").fill(slug);
await page
  .locator("#field-description")
  .fill("保存・公開・編集を確かめるための記事です。");
await page.getByRole("button", { name: "サンプル画像を使う" }).click();
await page.locator("#field-imageAlt").fill("ノートのサンプル画像");
await page
  .locator("#field-content")
  .fill("## 検証\n\n**入力内容を保持して公開します。**");
await page.getByRole("button", { name: "下書き保存", exact: true }).click();
await page.getByText("下書きを保存しました。", { exact: true }).waitFor();
const apiHeaders = { Origin: "http://127.0.0.1:3000" };
const mine = await (
  await context.request.get("http://127.0.0.1:3000/api/mine")
).json();
const draft = mine.entries.find((e) => e.slug === slug);
assert.ok(draft);
const body = {
  entry: draft,
  expectedVersion: draft.version,
  requestId: crypto.randomUUID(),
};
const savedOnce = await context.request.patch(
  "http://127.0.0.1:3000/api/articles/" + draft.id,
  { headers: apiHeaders, data: body },
);
assert.equal(savedOnce.status(), 200);
const savedAgain = await context.request.patch(
  "http://127.0.0.1:3000/api/articles/" + draft.id,
  { headers: apiHeaders, data: body },
);
assert.deepEqual(await savedOnce.json(), await savedAgain.json());
const conflict = await context.request.patch(
  "http://127.0.0.1:3000/api/articles/" + draft.id,
  { headers: apiHeaders, data: { ...body, requestId: crypto.randomUUID() } },
);
assert.equal(conflict.status(), 409);
const duplicate = await context.request.post(
  "http://127.0.0.1:3000/api/articles",
  { headers: apiHeaders, data: { ...body, requestId: crypto.randomUUID() } },
);
assert.equal(duplicate.status(), 409);
assert.equal(
  (
    await context.request.get(
      "http://127.0.0.1:3000/api/articles/summer-review",
    )
  ).status(),
  403,
);
assert.equal(
  (
    await context.request.post("http://127.0.0.1:3000/api/articles", {
      headers: { Origin: "https://untrusted.invalid" },
      data: body,
    })
  ).status(),
  403,
);
const anonymous = await browser.newContext();
assert.equal(
  (await anonymous.request.get("http://127.0.0.1:3000/api/mine")).status(),
  401,
);
await anonymous.close();
await page.reload();
await page.getByRole("link", { name: "投稿一覧", exact: false }).click();
await page
  .getByRole("row")
  .filter({ hasText: "検証用の記事" })
  .last()
  .getByRole("link", { name: "編集" })
  .click();
await page.locator("#field-title").waitFor();
assert.equal(await page.locator("#field-title").inputValue(), "検証用の記事");
await page.getByRole("button", { name: "公開する" }).click();
await page.getByRole("link", { name: "公開ページを見る" }).waitFor();
await page.getByRole("link", { name: "公開ページを見る" }).click();
await page
  .getByRole("heading", { name: "検証用の記事", exact: true })
  .waitFor();
assert.equal(
  await page
    .locator("strong")
    .filter({ hasText: "入力内容を保持して公開します。" })
    .count(),
  1,
);
await page.goto("http://127.0.0.1:3000/login");
await page.getByRole("button", { name: "管理者として試す" }).click();
await page.getByRole("link", { name: "管理画面", exact: true }).click();
await page.getByRole("heading", { name: "投稿とメンバーの管理" }).waitFor();
page.on("dialog", (d) => d.accept());
await page
  .getByRole("row")
  .filter({ hasText: "検証用の記事" })
  .last()
  .getByRole("button", { name: "非公開", exact: true })
  .click();
await page.getByText("非公開にしました。", { exact: true }).waitFor();
await page.screenshot({
  path: "tmp/screenshots/studio-desktop.png",
  fullPage: true,
});
await page.goto("http://127.0.0.1:3000/articles/" + slug);
await page.getByRole("heading", { name: "投稿が見つかりません。" }).waitFor();
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://127.0.0.1:3000/");
await page
  .getByRole("heading", { name: "学生がつくったものと、その過程。" })
  .waitFor();
await page.screenshot({
  path: "tmp/screenshots/home-mobile.png",
  fullPage: true,
});
assert.equal(
  await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  ),
  false,
);
await page.goto("http://127.0.0.1:3000/studio/new/works");
await page
  .getByRole("heading", { name: "成果物を投稿", exact: true })
  .waitFor();
await page.screenshot({
  path: "tmp/screenshots/editor-mobile.png",
  fullPage: true,
});
assert.equal(
  await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  ),
  false,
);
assert.deepEqual(errors, []);
console.log(
  "PASS: desktop/mobile, search, lazy iframe, validation, persistent draft, publish, unpublish, rich text, API authorization, CSRF, idempotency, duplicate slug, update conflict, no browser errors.",
);
await browser.close();
