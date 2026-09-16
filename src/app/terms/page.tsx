import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
export const metadata: Metadata = { title: "Terms", alternates: { canonical: "/terms" } };
export default function Terms() {
  return (<><SiteHeader /><main id="main" className="relative z-10 mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-14 font-body text-[1.1rem] leading-relaxed text-ink-2"><p className="eyebrow">Terms</p><h1 className="mt-3 mb-8 font-display text-[2.4rem] leading-tight tracking-tight text-ink">Terms of use</h1>
    <p>All poems on this site are the original work of Dev Parth and are protected by copyright. You are welcome to read, print for personal use, quote short excerpts with attribution, and share links.</p>
    <p className="mt-4">Please do not republish full poems, present them as your own, or use them to train machine-learning systems without written permission from the author.</p>
    <p className="mt-4">The archive is provided as-is. Poems are reproduced exactly as first published; any differences between versions on other platforms are noted where known.</p></main><SiteFooter /></>);
}
