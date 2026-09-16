import Link from "next/link";
import { SITE } from "@/lib/site";
export function SiteFooter() {
  return (
    <footer className="no-print relative z-10 mt-24 border-t rule">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-12 grid gap-8 sm:grid-cols-3 font-ui text-[0.8rem] text-ink-3">
        <div>
          <p className="font-display text-ink tracking-[0.22em] uppercase text-sm">Dev Parth</p>
          <p className="mt-2 max-w-xs leading-relaxed">Poetry archive and personal writings.</p>
        </div>
        <div>
          <p className="eyebrow mb-3">Also published on</p>
          <ul className="space-y-1.5">
            <li><a className="link text-ink-2" href={SITE.author.profiles.poetryCom} rel="me noopener" target="_blank">Poetry.com</a></li>
            <li><a className="link text-ink-2" href={SITE.author.profiles.myPoeticSide} rel="me noopener" target="_blank">My Poetic Side</a></li>
            <li><Link className="link text-ink-2" href="/rss.xml">RSS</Link></li>
          </ul>
        </div>
        <div className="sm:text-right space-y-1.5">
          <p>© {new Date().getFullYear()} Dev Parth. All poems are the author&apos;s own work.</p>
          <p><Link className="link" href="/privacy">Privacy</Link> · <Link className="link" href="/terms">Terms</Link> · <Link className="link" href="/admin">Admin</Link></p>
        </div>
      </div>
    </footer>
  );
}
