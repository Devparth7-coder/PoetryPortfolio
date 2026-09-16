"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/site/theme-toggle";
const NAV = [["/admin", "Dashboard"], ["/admin/poems", "Poems"], ["/admin/collections", "Collections"], ["/admin/tags", "Tags"], ["/admin/import", "Import"], ["/admin/media", "Media"], ["/admin/analytics", "Analytics"], ["/admin/data-quality", "Data quality"], ["/admin/audit", "Audit log"], ["/admin/settings", "Settings"]];
export function AdminShell({ user, children }: { user: { name: string; role: string }; children: React.ReactNode }) {
  const path = usePathname(); const router = useRouter();
  const logout = async () => { await fetch("/api/v1/auth/logout", { method: "POST" }); router.push("/admin/login"); router.refresh(); };
  return (
    <div className="relative z-10 min-h-dvh lg:grid lg:grid-cols-[14rem_1fr]">
      <aside className="border-b lg:border-b-0 lg:border-r rule bg-paper-2/60 px-4 py-4 lg:py-6 font-ui text-[0.82rem]">
        <div className="flex items-center justify-between lg:block">
          <Link href="/admin" className="font-display tracking-[0.2em] uppercase text-sm">Dev Parth</Link>
          <span className="eyebrow lg:mt-1 lg:block">Editorial</span>
        </div>
        <nav aria-label="Admin" className="mt-4 lg:mt-8 flex flex-wrap gap-1 lg:flex-col">
          {NAV.map(([h, l]) => { const active = h === "/admin" ? path === h : path.startsWith(h); return <Link key={h} href={h} aria-current={active ? "page" : undefined} className={`rounded px-3 py-1.5 hover:bg-paper ${active ? "bg-paper text-accent font-medium" : "text-ink-2"}`}>{l}</Link>; })}
        </nav>
        <div className="mt-6 lg:mt-10 flex items-center justify-between gap-2 text-ink-3">
          <span className="truncate">{user.name} · {user.role.toLowerCase()}</span>
          <div className="flex items-center"><ThemeToggle /><button type="button" onClick={logout} className="link ml-1">Sign out</button></div>
        </div>
        <Link href="/" className="link mt-3 block text-ink-3">← View site</Link>
      </aside>
      <main id="main" className="px-5 py-6 sm:px-8 lg:py-8 max-w-6xl">{children}</main>
    </div>
  );
}
