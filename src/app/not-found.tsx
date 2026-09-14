import Link from "next/link";
export default function NotFound() {
  return (
    <main className="wrap empty">
      <h1>ページが見つかりません。</h1>
      <Link href="/">トップページへ戻る →</Link>
    </main>
  );
}
