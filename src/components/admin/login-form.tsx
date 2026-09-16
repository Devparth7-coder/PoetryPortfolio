/* eslint-disable @next/next/no-html-link-for-pages -- error boundary and login use full-page navigation on purpose */
"use client";
import { useState } from "react";
export function LoginForm({ next }: { next: string }) {
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setBusy(true); setErr(null); const fd = new FormData(e.currentTarget);
    const r = await fetch("/api/v1/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }) });
    if (r.ok) window.location.href = next; else { const j = await r.json().catch(() => ({})); setErr(j.error?.message ?? "Sign in failed"); setBusy(false); }
  };
  return (<form onSubmit={submit} className="mt-8 space-y-4 font-ui text-sm">
    <label className="block"><span className="eyebrow">Email</span><input name="email" type="email" required autoComplete="username" className="mt-1 w-full rounded border rule bg-paper-2 px-3 py-2 outline-none focus:border-accent" /></label>
    <label className="block"><span className="eyebrow">Password</span><input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full rounded border rule bg-paper-2 px-3 py-2 outline-none focus:border-accent" /></label>
    {err && <p role="alert" className="text-red-700 dark:text-red-400">{err}</p>}
    <button disabled={busy} className="w-full rounded bg-ink px-4 py-2.5 text-paper hover:opacity-90 disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
    <p className="text-center text-ink-3"><a href="/" className="link">← Back to the archive</a></p>
  </form>);
}
