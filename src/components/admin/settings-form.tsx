"use client";
import { useState } from "react";
import { btnCls, inputCls } from "./ui";
export function SettingsForm({ site, book, canEdit }: { site: Record<string, unknown>; book: Record<string, unknown>; canEdit: boolean }) {
  const [s, setS] = useState({ title: String(site.title ?? "Dev Parth"), tagline: String(site.tagline ?? ""), commentsEnabled: !!site.commentsEnabled }); const [b, setB] = useState({ title: String(book.title ?? "Inkscapes"), subtitle: String(book.subtitle ?? "Poetry by Dev Parth"), dedication: String(book.dedication ?? "") }); const [msg, setMsg] = useState<string | null>(null);
  const save = async () => { const r = await fetch("/api/v1/admin/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ site: s, book: b }) }); setMsg(r.ok ? "Saved" : "Failed"); };
  return (<div className="grid gap-8 md:grid-cols-2 font-ui text-sm">
    <fieldset disabled={!canEdit} className="space-y-3"><legend className="eyebrow mb-2">Site</legend><label className="block">Title<input value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} className={inputCls} /></label><label className="block">Tagline<input value={s.tagline} onChange={(e) => setS({ ...s, tagline: e.target.value })} className={inputCls} /></label><label className="flex items-center gap-2"><input type="checkbox" checked={s.commentsEnabled} onChange={(e) => setS({ ...s, commentsEnabled: e.target.checked })} />Enable comments <span className="text-xs text-ink-3">(off by default; requires moderation — see docs)</span></label></fieldset>
    <fieldset disabled={!canEdit} className="space-y-3"><legend className="eyebrow mb-2">Book mode</legend><label className="block">Book title<input value={b.title} onChange={(e) => setB({ ...b, title: e.target.value })} className={inputCls} /></label><label className="block">Subtitle<input value={b.subtitle} onChange={(e) => setB({ ...b, subtitle: e.target.value })} className={inputCls} /></label><label className="block">Dedication<textarea value={b.dedication} onChange={(e) => setB({ ...b, dedication: e.target.value })} rows={3} className={inputCls} /></label></fieldset>
    {canEdit && <div className="flex items-center gap-3"><button type="button" onClick={save} className={btnCls}>Save settings</button><span className="text-ink-3" aria-live="polite">{msg}</span></div>}
  </div>);
}
