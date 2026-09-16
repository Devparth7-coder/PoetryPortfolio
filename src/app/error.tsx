/* eslint-disable @next/next/no-html-link-for-pages -- error boundary and login use full-page navigation on purpose */
"use client";
import { useEffect } from "react";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("page-error", error.digest ?? error.message); }, [error]);
  return (<main id="main" className="relative z-10 mx-auto max-w-2xl px-5 py-32 text-center"><p className="eyebrow">Something went wrong</p><h1 className="mt-4 font-display text-[2.2rem] tracking-tight">The page could not be shown.</h1><p className="mt-4 font-body italic text-ink-3">Nothing has been lost. {error.digest && <span className="font-ui not-italic text-xs">Ref {error.digest}</span>}</p><div className="mt-8 font-ui text-[0.78rem] uppercase tracking-[0.16em]"><button type="button" onClick={reset} className="link">Try again</button><span className="mx-3 text-ink-3">·</span><a href="/" className="link">Home</a></div></main>);
}
