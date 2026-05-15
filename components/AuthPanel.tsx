"use client";

import { FormEvent, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AuthPanelProps = {
  onRecoveryMode?: () => void;
};

const sharedLoginEmail = process.env.NEXT_PUBLIC_SHARED_LOGIN_EMAIL ?? "";

export function AuthPanel({ onRecoveryMode }: AuthPanelProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const helperText = useMemo(() => {
    if (sharedLoginEmail) {
      return `공용 ID calendar 또는 ${sharedLoginEmail}로 로그인할 수 있습니다.`;
    }

    return "Supabase Auth에 만든 공용 이메일 계정으로 로그인합니다.";
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setStatus("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizeIdentifier(identifier),
      password
    });

    if (signInError) {
      setError("이메일 또는 비밀번호를 확인해 주세요.");
    }

    setSubmitting(false);
  }

  async function sendResetEmail() {
    const email = normalizeIdentifier(identifier);

    if (!email.includes("@")) {
      setError("비밀번호 재설정에는 이메일 주소가 필요합니다.");
      return;
    }

    setSubmitting(true);
    setError("");
    setStatus("");

    const redirectTo =
      typeof window === "undefined" ? undefined : window.location.origin;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo }
    );

    if (resetError) {
      setError("비밀번호 재설정 메일을 보내지 못했습니다.");
    } else {
      setStatus("비밀번호 재설정 메일을 보냈습니다.");
      onRecoveryMode?.();
    }

    setSubmitting(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-soft">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent">
          <CalendarDays aria-hidden className="size-4" />
          Team Calendar
        </div>
        <h1 className="mt-2 text-2xl font-bold text-ink">로그인</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{helperText}</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-ink">이메일 또는 ID</span>
            <input
              autoCapitalize="none"
              autoCorrect="off"
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
              placeholder={sharedLoginEmail ? "calendar" : "calendar@example.com"}
              required
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-ink">비밀번호</span>
            <input
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {status && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {status}
            </div>
          )}

          <button
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "처리 중..." : "로그인"}
          </button>
        </form>

        <button
          className="mt-4 w-full text-sm font-semibold text-accent hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting}
          type="button"
          onClick={sendResetEmail}
        >
          비밀번호 재설정 메일 보내기
        </button>
      </section>
    </main>
  );
}

function normalizeIdentifier(value: string) {
  const trimmedValue = value.trim();

  if (sharedLoginEmail && trimmedValue.toLowerCase() === "calendar") {
    return sharedLoginEmail;
  }

  return trimmedValue.toLowerCase();
}
