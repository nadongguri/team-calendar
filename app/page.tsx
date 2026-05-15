"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthPanel } from "@/components/AuthPanel";
import { TeamCalendar } from "@/components/TeamCalendar";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      return;
    }

    supabase.rpc("is_calendar_admin").then(({ data }) => {
      setIsAdmin(Boolean(data));
    });
  }, [session]);

  const email = useMemo(() => session?.user.email ?? "", [session]);

  if (!isSupabaseConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <section className="w-full max-w-xl rounded-lg border border-line bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Supabase 설정 필요
          </p>
          <h1 className="mt-2 text-2xl font-bold text-ink">
            환경변수를 추가해 주세요
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            <code className="rounded bg-panel px-1">.env.example</code>을{" "}
            <code className="rounded bg-panel px-1">.env.local</code>로 복사한 뒤{" "}
            <code className="rounded bg-panel px-1">NEXT_PUBLIC_SUPABASE_URL</code>와{" "}
            <code className="rounded bg-panel px-1">
              NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
            </code>
            를 설정해 주세요.
          </p>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg border border-line bg-white px-5 py-4 text-sm font-medium text-muted shadow-soft">
          로그인 상태를 확인하는 중...
        </div>
      </main>
    );
  }

  if (!session) {
    return <AuthPanel />;
  }

  return (
    <TeamCalendar
      isAdmin={isAdmin}
      userEmail={email}
      userId={session.user.id}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}
