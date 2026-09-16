import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Library } from "@/components/reading/library";
export const metadata: Metadata = { title: "Your library", description: "Your favourites, bookmarks and reading history — stored only on this device.", robots: { index: false } };
export default function LibraryPage() {
  return (<><SiteHeader /><main id="main" className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8 pt-8 sm:pt-14"><p className="eyebrow">Your library</p><h1 className="mt-3 font-display text-[2.4rem] sm:text-[3.2rem] leading-[1.05] tracking-tight">What you kept.</h1><p className="mt-4 max-w-xl font-body text-[1.05rem] text-ink-2">Favourites, bookmarks and reading history live only in this browser. Nothing is sent to a server, and you can clear it anytime.</p><Library /></main><SiteFooter /></>);
}
