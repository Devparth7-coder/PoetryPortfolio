import Link from "next/link";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
export default function NotFound() {
  return (<><SiteHeader /><main id="main" className="relative z-10 mx-auto max-w-2xl px-5 py-32 text-center"><p className="eyebrow">404</p><h1 className="mt-4 font-display text-[2.4rem] tracking-tight">There is nothing written here.</h1><p className="mt-8 font-ui text-[0.78rem] uppercase tracking-[0.16em]"><Link href="/" className="link">Home</Link><span className="mx-3 text-ink-3">·</span><Link href="/poems" className="link">All poems</Link></p></main><SiteFooter /></>);
}
