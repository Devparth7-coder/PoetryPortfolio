import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { getAuthor, getArchiveTimeline } from "@/application/poems/poem-service";
import { SITE, abs } from "@/lib/site";
export const metadata: Metadata = { title: "About Dev Parth", description: "Dev Parth writes about the emotions people don't always say out loud — first love, distance, growing up, and quiet heartbreak.", alternates: { canonical: "/about" } };
export const revalidate = 3600;
export default async function AboutPage() {
  const [author, timeline] = await Promise.all([getAuthor(), getArchiveTimeline()]);
  const total = timeline.years.reduce((s, y) => s + y.total, 0) + timeline.undated;
  const jsonLd = { "@context": "https://schema.org", "@type": "Person", name: "Dev Parth", url: abs("/about"), jobTitle: "Poet", description: author.bio, sameAs: author.links.map((l) => l.url), mainEntityOfPage: abs("/about") };
  return (
    <>
      <SiteHeader />
      <main id="main" className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8 pt-8 sm:pt-14">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="eyebrow">About the poet</p>
            <h1 className="mt-3 font-display text-[2.6rem] sm:text-[3.6rem] leading-[1.02] tracking-tight">Dev Parth</h1>
            <p className="mt-4 font-body text-[1.2rem] italic text-ink-2">I write what people remember at midnight.</p>
            <dl className="mt-10 grid grid-cols-2 gap-6 font-ui text-[0.78rem]">
              <div><dt className="eyebrow">Poems archived</dt><dd className="mt-1 font-display text-[1.8rem]">{total}</dd></div>
              <div><dt className="eyebrow">Writing since</dt><dd className="mt-1 font-display text-[1.8rem]">{timeline.years.at(-1)?.year}</dd></div>
            </dl>
          </div>
          <div className="font-body text-[1.15rem] leading-[1.75] text-ink-2 space-y-5">
            <p>My name is Dev Parth. I am a poet who writes about the emotions people don&apos;t always say out loud. I write about first love, distance, growing up, and the quiet heartbreak that doesn&apos;t make noise but changes everything.</p>
            <p>I started writing not to impress anyone, but to understand myself. Sometimes feelings are too heavy to explain in conversations, so I turn them into words. Writing became the place where I could be honest without interruption.</p>
            <p>Most of my poetry is inspired by real moments — school corridors after the last exam, railway stations at sunset, late-night chats that slowly become shorter, and promises made at seventeen that time could not protect.</p>
            <p>I am also a Computer Science student, building my future in technology while carrying a deep love for creativity. Logic helps me think clearly, but poetry helps me feel deeply. I believe a person can build software by day and build emotions with words at night.</p>
            <p>My writing is simple, but it is intentional. I don&apos;t use complicated language. I write in a way that feels real. If someone reads my poem and thinks, “This feels like my story,” then I have done my job.</p>
            <p>I believe not all endings are loud. Some fade. And I write about those fades before they disappear completely.</p>
            <h2 className="pt-6 eyebrow">About this archive</h2>
            <p>This site is my personal archive. Every poem here was written by me and first published on the platforms below. Poems are stored exactly as they were written — no automatic corrections, no rewriting — and each one keeps a record of where and when it first appeared.</p>
            <ul className="font-ui text-[0.85rem] space-y-2 pt-2">
              <li><a href={SITE.author.profiles.myPoeticSide} className="link" rel="me noopener" target="_blank">My Poetic Side</a> <span className="text-ink-3">— mypoeticside.com/user-51801</span></li>
              <li><a href={SITE.author.profiles.poetryCom} className="link" rel="me noopener" target="_blank">Poetry.com</a> <span className="text-ink-3">— poetry.com/user/318517/devparth9784</span></li>
            </ul>
            <p className="pt-6 font-ui text-[0.78rem] uppercase tracking-[0.16em]"><Link href="/poems" className="link">Read the poems</Link><span className="mx-3 text-ink-3">·</span><Link href="/archive" className="link">Explore the archive</Link></p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
