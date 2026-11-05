"use client";

import { useClerk, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

const schoolDomain = "@st.kanazawa-it.ac.jp";

export default function AuthenticationSignup() {
  const router = useRouter();
  const { signUp, fetchStatus } = useSignUp();
  const { signOut } = useClerk();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const pending = fetchStatus === "fetching" || lock.current;

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    const normalized = email.trim().toLowerCase();
    if (!normalized.endsWith(schoolDomain)) {
      setError("学校のメールアドレスを入力してください。");
      return;
    }
    if (password.length < 8 || password !== confirmation) {
      setError("パスワードは8文字以上で、確認入力と一致させてください。");
      return;
    }

    lock.current = true;
    try {
      if (signUp.status === "complete") await signOut(async () => {});
      const result = await signUp.password({
        emailAddress: normalized,
        password,
      });
      if (result.error) throw new Error("signup_failed");
      const verification = await signUp.verifications.sendEmailCode();
      if (verification.error) throw new Error("verification_failed");
      setVerifying(true);
    } catch {
      setError("登録情報を確認してください。時間をおいて再試行してください。");
    } finally {
      lock.current = false;
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    lock.current = true;
    setError("");
    try {
      const result = await signUp.verifications.verifyEmailCode({
        code: code.trim(),
      });
      if (result.error || signUp.status !== "complete") {
        throw new Error("verification_failed");
      }
      const finalized = await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session.currentTask) throw new Error("finalize_task_required");
          const destination = decorateUrl("/studio");
          if (destination.startsWith("/") && !destination.startsWith("//")) {
            router.replace(destination);
          } else {
            window.location.assign(destination);
          }
        },
      });
      if (finalized.error) throw new Error("finalize_failed");
    } catch {
      setError("確認コードが正しくありません。メールを確認してください。");
    } finally {
      lock.current = false;
    }
  }

  return (
    <form
      className="auth-system-card"
      onSubmit={(event) => void (verifying ? verify(event) : register(event))}
    >
      <div className="auth-system-mark">Data Dreamers Member Portal</div>
      <h1>{verifying ? "メールを確認する" : "DataDreamersに参加する"}</h1>
      <p>
        {verifying
          ? `${email} に届いた確認コードを入力してください。`
          : "学校メールでアカウントを作成します。"}
      </p>
      {!verifying ? (
        <>
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
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label>
            パスワード（確認）
            <input
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <div id="clerk-captcha" />
        </>
      ) : (
        <label>
          メール確認コード
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
        </label>
      )}
      {error && (
        <p className="auth-system-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary" disabled={pending}>
        {pending
          ? "確認しています…"
          : verifying
            ? "メールを確認する →"
            : "確認コードを送信 →"}
      </button>
    </form>
  );
}
