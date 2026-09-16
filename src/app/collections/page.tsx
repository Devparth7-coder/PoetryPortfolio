import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { listPublicCollections } from "@/application/collections/collection-service";
import { plural } from "@/lib/format";
export const metadata: Metadata = { title: "Collections", description: "Dev Parth's poems, gathered by feeling: love, loss, identity, solitude, healing, hope and more.", alternates: { canonical: "/collections" } };
export const revalidate = 600;
export default async function CollectionsPage() {
  const cols = (await listPublicCollections()).filter((c) => c.poemCount > 0);
  return (
    <>
      <SiteHeader />
      <main id="main" className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8 pt-8 sm:pt-14">
        <p className="eyebrow">Collections</p>
        <h1 className="mt-3 font-display text-[2.4rem] sm:text-[3.2rem] leading-[1.05] tracking-tight">Read by feeling.</h1>
        <p className="mt-4 max-w-xl font-body text-[1.1rem] text-ink-2">Collections are curated by hand, not by an algorithm. A poem may live in more than one.</p>
        {cols.length === 0 ? <p className="mt-16 font-body italic text-ink-3">The collections are still being organised. In the meantime, <Link href="/poems" className="link">browse every poem</Link>.</p> : (
          <ul className="mt-14 grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-3">
            {cols.map((c) => (<li key={c.id} className="bg-paper"><Link href={`/collections/${c.slug}`} className="group block h-full p-7 hover:bg-paper-2 transition-colors"><h2 className="font-display text-[1.8rem] leading-tight group-hover:text-accent transition-colors">{c.title}</h2>{c.description && <p className="mt-2 font-body italic text-ink-3">{c.description}</p>}<p className="mt-6 font-ui text-[0.68rem] uppercase tracking-[0.14em] text-ink-3">{plural(c.poemCount, "poem")}{c.featuredTitle && <> · begins with <span className="text-ink-2">{c.featuredTitle}</span></>}</p></Link></li>))}
          </ul>)}
      </main>
      <SiteFooter />
    </>
  );
}
