"use client";

import { useClerk, useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

const failureMessage = "パスワードまたは秘密の暗号が正しくありません。";

export default function AuthenticationLogin() {
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();
  const clerk = useClerk();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);
  const pending = submitting || fetchStatus === "fetching";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || lock.current) return;
    lock.current = true;
    setSubmitting(true);
    setError("");
    let sessionStarted = false;
    let authenticationCompleted = false;

    try {
      if (
        clerk.session ||
        clerk.client?.sessions.some((session) => session.status === "active")
      ) {
        await clerk.signOut(async () => {});
      }

      const passwordResult = await signIn.password({
        emailAddress: email.trim().toLowerCase(),
        password,
      });
      if (passwordResult.error || signIn.status !== "complete") {
        setError(failureMessage);
        return;
      }

      let destination = "/studio";
      sessionStarted = true;
      const finalizeResult = await signIn.finalize({
        navigate: async ({ decorateUrl }) => {
          destination = decorateUrl("/studio");
        },
      });
      if (finalizeResult.error) {
        setError(failureMessage);
        return;
      }

      const response = await fetch("/api/invite/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || result.ok !== true) {
        setError(
          response.status === 401
            ? "ログインセッションを確認できません。もう一度ログインしてください。"
            : response.status === 403
              ? "秘密の暗号、学校メールの確認状態を確認してください。"
              : failureMessage,
        );
        return;
      }

      authenticationCompleted = true;
      if (destination.startsWith("/") && !destination.startsWith("//")) {
        router.replace(destination);
      } else {
        window.location.assign(destination);
      }
    } catch {
      setError(failureMessage);
    } finally {
      if (sessionStarted && !authenticationCompleted) {
        await clerk.signOut(async () => {}).catch(() => undefined);
      }
      lock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-system-card" onSubmit={(event) => void submit(event)}>
      <div className="auth-system-mark">Data Dreamers Member Portal</div>
      <h1>活動の続きを、ここから。</h1>
      <p>学校メール・パスワード・秘密の暗号でログインしてください。</p>
      <label>
        学校メールアドレス
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>
      <label>
        パスワード
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      <label>
        秘密の暗号
        <input
          type="password"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="one-time-code"
          minLength={8}
          maxLength={128}
          required
        />
      </label>
      {error && (
        <p className="auth-system-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary" disabled={pending}>
        {pending ? "確認しています…" : "ログイン →"}
      </button>
    </form>
  );
}
