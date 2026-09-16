import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
export const metadata: Metadata = { title: "Privacy", alternates: { canonical: "/privacy" } };
export default function Privacy() {
  return (<><SiteHeader /><main id="main" className="relative z-10 mx-auto max-w-2xl px-5 sm:px-8 pt-8 sm:pt-14 font-body text-[1.1rem] leading-relaxed text-ink-2"><p className="eyebrow">Privacy</p><h1 className="mt-3 mb-8 font-display text-[2.4rem] leading-tight tracking-tight text-ink">Privacy</h1>
    <p>This is a personal poetry archive. It is built to collect as little as possible.</p>
    <h2 className="mt-8 font-display text-[1.4rem] text-ink">What is stored on your device</h2><p>Theme and text-size preferences, favourites, bookmarks and reading history are kept in your browser&apos;s local storage. They never leave your device. You can clear them from <a href="/library" className="link">your library</a> or by clearing site data.</p>
    <h2 className="mt-8 font-display text-[1.4rem] text-ink">What is stored on the server</h2><p>Only anonymous daily counters: how many times a poem was opened, finished, favourited or shared, and which search terms were used. No IP addresses, cookies, fingerprints or user agents are recorded for readers. Rate-limiting uses a short-lived in-memory counter that is not persisted.</p>
    <h2 className="mt-8 font-display text-[1.4rem] text-ink">Cookies</h2><p>Readers get no cookies. A single session cookie is set only for the administrator after logging in.</p>
    <h2 className="mt-8 font-display text-[1.4rem] text-ink">Third parties</h2><p>Fonts are self-hosted. No analytics scripts, advertising or embedded trackers are loaded. Share buttons open the chosen service directly; nothing is loaded from it beforehand.</p>
    <h2 className="mt-8 font-display text-[1.4rem] text-ink">Contact</h2><p>Questions can be sent through the author&apos;s profile on <a href="https://mypoeticside.com/user-51801" className="link" rel="noopener" target="_blank">My Poetic Side</a>.</p></main><SiteFooter /></>);
}
