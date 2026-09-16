import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { SearchButton } from "./search-button";

export function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  return (
    <header className="no-print relative z-10">
      <nav aria-label="Primary" className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="font-display text-[1.05rem] tracking-[0.22em] uppercase text-ink hover:text-accent transition-colors">Dev Parth</Link>
        <div className="flex items-center gap-1 sm:gap-2 font-ui text-[0.8rem]">
          {!minimal && (
            <ul className="hidden md:flex items-center gap-6 mr-4 text-ink-2">
              <li><Link className="link" href="/poems">Poems</Link></li>
              <li><Link className="link" href="/archive">Archive</Link></li>
              <li><Link className="link" href="/collections">Collections</Link></li>
              <li><Link className="link" href="/book">Book</Link></li>
              <li><Link className="link" href="/about">About</Link></li>
            </ul>
          )}
          <SearchButton />
          <ThemeToggle />
          {!minimal && <MobileMenu />}
        </div>
      </nav>
    </header>
  );
}

function MobileMenu() {
  return (
    <details className="md:hidden relative">
      <summary aria-label="Menu" className="list-none cursor-pointer rounded p-2 hover:bg-paper-2 [&::-webkit-details-marker]:hidden">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </summary>
      <ul className="absolute right-0 mt-2 w-44 rounded-md border rule bg-paper p-2 shadow-lg font-ui text-sm">
        {[["/poems", "Poems"], ["/archive", "Archive"], ["/collections", "Collections"], ["/book", "Book mode"], ["/random", "Read something unexpected"], ["/about", "About"], ["/library", "Your library"]].map(([h, l]) => (
          <li key={h}><Link href={h} className="block rounded px-3 py-2 hover:bg-paper-2">{l}</Link></li>
        ))}
      </ul>
    </details>
  );
}
