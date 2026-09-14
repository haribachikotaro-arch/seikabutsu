import test from "node:test";
import assert from "node:assert/strict";
import {
  publicUrl,
  validateEntry,
  editable,
  imageError,
  emptyEntry,
} from "../src/lib/model";
import { seed } from "../src/lib/seed";
import { safeHtml } from "../worker/index";
test("public URLs reject internal addresses, alternate numeric forms, credentials, and dangerous schemes", () => {
  for (const url of [
    "http://example.org",
    "javascript:alert(1)",
    "data:text/html,hi",
    "file:///etc/passwd",
    "https://localhost",
    "https://127.0.0.1",
    "https://2130706433",
    "https://0x7f000001",
    "https://192.168.1.4",
    "https://[::1]",
    "https://[::ffff:127.0.0.1]",
    "https://app.internal",
    "https://user:pass@public.org",
    "https://app.localhost",
    "https://foo.local",
    "https://public.org:8080",
  ])
    assert.equal(publicUrl(url), false, url);
  assert.equal(publicUrl("https://my-app.pages.dev/path?test=yes"), true);
});
test("required fields, length, slug, image description, and technology limits", () => {
  assert.ok(validateEntry(emptyEntry("works")).title);
  assert.equal(Object.keys(validateEntry(seed[0], true, true)).length, 0);
  const e = {
    ...seed[0],
    title: "x".repeat(121),
    slug: "Upper_Case",
    imageAlt: "",
    techStack: Array(11).fill("React"),
  };
  const errors = validateEntry(e, true, true);
  for (const key of ["title", "slug", "imageAlt", "techStack"])
    assert.ok(errors[key]);
  assert.equal(
    Object.keys(validateEntry(emptyEntry("articles"), false)).length,
    0,
  );
});
test("editors own their posts; admin can edit across members", () => {
  assert.equal(
    editable(seed[0], { id: "someone-else", name: "other", role: "editor" }),
    false,
  );
  assert.equal(
    editable(seed[0], { id: "demo-editor", name: "member", role: "editor" }),
    true,
  );
  assert.equal(
    editable(seed[0], { id: "someone-else", name: "admin", role: "admin" }),
    true,
  );
});
test("images enforce MIME and 5MB boundary", () => {
  assert.equal(imageError({ size: 5242880, type: "image/png" }), "");
  assert.ok(imageError({ size: 5242881, type: "image/png" }));
  assert.ok(imageError({ size: 100, type: "image/svg+xml" }));
});
test("HTML preserves authoring elements but removes script, iframe, events and unsafe links", () => {
  const html = safeHtml(
    '## 見出し\n\n**太字**\n\n- 項目\n\n<script>alert(1)</script><iframe src="https://evil.org"></iframe><img src="https://images.example.org/a.png" onerror="alert(1)"><a href="javascript:alert(1)">悪いリンク</a>',
  );
  assert.match(html, /<h2>/);
  assert.match(html, /<strong>/);
  assert.match(html, /<li>/);
  assert.doesNotMatch(html, /<script|<iframe|onerror|javascript:/);
});
