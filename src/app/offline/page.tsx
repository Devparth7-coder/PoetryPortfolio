import { SiteHeader } from "@/components/site/header";
export const metadata = { title: "Offline", robots: { index: false } };
export default function Offline() {
  return (<><SiteHeader minimal /><main id="main" className="relative z-10 mx-auto max-w-xl px-5 py-32 text-center"><p className="eyebrow">Offline</p><h1 className="mt-4 font-display text-[2.2rem] tracking-tight">You&apos;re not connected.</h1><p className="mt-4 font-body italic text-ink-3">Poems you have already opened are still available from <a href="/library" className="link">your library</a>.</p></main></>);
}
