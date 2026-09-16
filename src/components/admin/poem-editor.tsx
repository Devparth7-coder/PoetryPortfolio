"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, btn2Cls, btnCls, inputCls, statusTone } from "./ui";
import { formatDate } from "@/lib/format";
import { SOURCE_LABELS, type SourceKind } from "@/domain/poem/types";

type Version = { id: string; version: number; kind: string; title: string; body: string; language: string; changeNote: string | null; createdAt: string };
type Source = { id: string; source: SourceKind; sourceUrl: string | null; sourcePublishedAt: string | null; isCanonical: boolean; sourceCategories: string[] };
type Poem = { id: string; slug: string; title: string; body: string; language: string; status: string; featured: boolean; excerpt: string | null; writtenAt: string | null; publishedAt: string | null; publishAt: string | null; unpublishAt: string | null; seoTitle: string | null; seoDescription: string | null; version: number; updatedAt: string; metadata: Record<string, unknown>; versions: Version[]; sources: Source[]; tags: { tag: { id: string } }[]; collections: { collection: { id: string } }[] };
type Tag = { id: string; name: string; kind: string }; type Col = { id: string; title: string };
type DiffLine = { type: "same" | "add" | "del"; text: string };

const toLocal = (iso: string | null | undefined) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

export function PoemEditor({ poem, tags, collections }: { poem: Poem | null; tags: Tag[]; collections: Col[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ title: poem?.title ?? "", body: poem?.body ?? "", language: poem?.language ?? "en", status: poem?.status ?? "DRAFT", featured: poem?.featured ?? false, excerpt: poem?.excerpt ?? "", writtenAt: toLocal(poem?.writtenAt), publishAt: toLocal(poem?.publishAt), unpublishAt: toLocal(poem?.unpublishAt), seoTitle: poem?.seoTitle ?? "", seoDescription: poem?.seoDescription ?? "", slug: poem?.slug ?? "", tagIds: poem?.tags.map((t) => t.tag.id) ?? [], collectionIds: poem?.collections.map((c) => c.collection.id) ?? [], sourceUrl: "", sourceKind: "MANUAL" as SourceKind });
  const [id, setId] = useState(poem?.id ?? null);
  const [saved, setSaved] = useState<string | null>(poem ? "Saved" : null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [versions, setVersions] = useState<Version[]>(poem?.versions ?? []);
  const [cmp, setCmp] = useState<{ a: string; b: string } | null>(null);
  const [diff, setDiff] = useState<DiffLine[] | null>(null);
  const [ai, setAi] = useState<{ enabled: boolean; result?: { label: string; data: { tags: string[]; themes: string[]; excerpt: string; language: string } } }>({ enabled: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };
  const original = useMemo(() => versions.find((v) => v.kind === "ORIGINAL"), [versions]);
  const textChanged = original ? original.body !== form.body || original.title !== form.title : false;

  useEffect(() => { fetch("/api/v1/admin/ai").then((r) => r.json()).then((d) => setAi({ enabled: !!d.data?.enabled })).catch(() => {}); }, []);

  const payload = useCallback((extra: Record<string, unknown> = {}) => ({ title: form.title, body: form.body, language: form.language, status: form.status, featured: form.featured, excerpt: form.excerpt || null, writtenAt: fromLocal(form.writtenAt), publishAt: fromLocal(form.publishAt), unpublishAt: fromLocal(form.unpublishAt), seoTitle: form.seoTitle || null, seoDescription: form.seoDescription || null, tagIds: form.tagIds, collectionIds: form.collectionIds, ...(form.slug && poem && form.slug !== poem.slug ? { slug: form.slug } : {}), ...extra }), [form, poem]);

  const save = useCallback(async (opts: { status?: string; changeNote?: string; silent?: boolean } = {}) => {
    if (!form.title.trim() || !form.body.trim()) return;
    setBusy(true); setErr(null);
    try {
      const body = payload({ status: opts.status ?? form.status, changeNote: opts.changeNote });
      const r = await fetch(id ? `/api/v1/admin/poems/${id}` : "/api/v1/admin/poems", { method: id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error?.message ?? "Save failed");
      if (!id) { setId(j.data.id); router.replace(`/admin/poems/${j.data.id}`); } else { const v = await fetch(`/api/v1/admin/poems/${id}/versions`).then((x) => x.json()); setVersions(v.data.versions); }
      if (opts.status) set("status", opts.status);
      setDirty(false); setSaved(`Saved ${new Date().toLocaleTimeString()}`);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }, [form, id, payload, router]);

  // Autosave (drafts & existing poems) 2s after last change
  useEffect(() => { if (!dirty) return; if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => save({ silent: true }), 2000); return () => { if (timer.current) clearTimeout(timer.current); }; }, [form, dirty, save]);
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); } }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, [dirty]);

  const compare = async (a: string, b: string) => { setCmp({ a, b }); const r = await fetch(`/api/v1/admin/poems/${id}/versions?a=${a}&b=${b}`).then((x) => x.json()); setDiff(r.data.diff); };
  const restore = async (versionId: string) => { if (!confirm("Restore this version? The current text is preserved as a new version.")) return; await fetch(`/api/v1/admin/poems/${id}/restore`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ versionId }) }); router.refresh(); location.reload(); };
  const suggest = async () => { const r = await fetch("/api/v1/admin/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task: "suggest", title: form.title, body: form.body }) }).then((x) => x.json()); setAi((a) => ({ ...a, result: r.data })); };
  const archive = async () => { if (!id || !confirm("Archive this poem? It will be hidden from the public site but kept with all versions.")) return; await fetch(`/api/v1/admin/poems/${id}`, { method: "DELETE" }); router.push("/admin/poems"); };

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_20rem]">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3 font-ui text-xs">
          <Link href="/admin/poems" className="link text-ink-3">← Poems</Link>
          {poem && <Badge tone={statusTone(form.status)}>{form.status}</Badge>}
          {poem && <span className="text-ink-3">v{poem.version} · {textChanged && <span className="text-amber-700">text differs from original</span>}</span>}
          <span className="ml-auto text-ink-3" aria-live="polite">{busy ? "Saving…" : dirty ? "Unsaved changes" : saved}</span>
        </div>
        {err && <p role="alert" className="mb-3 rounded border border-red-700/40 px-3 py-2 font-ui text-sm text-red-800 dark:text-red-400">{err}</p>}
        <input aria-label="Title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Title" className="w-full bg-transparent font-display text-[2.2rem] leading-tight outline-none placeholder:text-ink-3" />
        <div className="mt-4 flex gap-2 font-ui text-xs"><button type="button" onClick={() => setPreview(false)} className={`rounded px-3 py-1 ${!preview ? "bg-paper-2 text-accent" : "text-ink-3"}`}>Write</button><button type="button" onClick={() => setPreview(true)} className={`rounded px-3 py-1 ${preview ? "bg-paper-2 text-accent" : "text-ink-3"}`}>Preview</button><span className="ml-auto text-ink-3">{form.body.split("\n").filter((l) => l.trim()).length} lines · {form.body.trim().split(/\s+/).filter(Boolean).length} words</span></div>
        {preview ? (<div className="mt-3 rounded border rule p-6 sm:p-10"><h2 className="font-display text-[2rem] leading-tight">{form.title}</h2><div className="poem-body mt-8" lang={form.language.split("-")[0]}>{form.body}</div></div>)
          : (<textarea aria-label="Poem body" value={form.body} onChange={(e) => set("body", e.target.value)} placeholder="Write the poem. Line breaks are preserved exactly." spellCheck={false} rows={Math.max(18, form.body.split("\n").length + 4)} className="mt-3 w-full resize-y rounded border rule bg-paper px-5 py-4 font-body text-[1.15rem] leading-[1.7] outline-none focus:border-accent" style={{ whiteSpace: "pre-wrap" }} />)}
        <p className="mt-2 font-ui text-xs text-ink-3">The text is stored verbatim. Nothing is auto-corrected. Every change to the text creates a new version; the original is never overwritten.</p>

        {poem && (
          <section className="mt-10">
            <h2 className="eyebrow mb-3">Revision history</h2>
            <ul className="divide-y divide-[var(--rule)] rounded border rule font-ui text-sm">
              {versions.map((v) => (<li key={v.id} className="flex flex-wrap items-center gap-3 px-3 py-2"><span className="font-medium tabular-nums">v{v.version}</span><Badge tone={v.kind === "ORIGINAL" ? "info" : v.kind === "SOURCE_VARIANT" ? "warn" : "neutral"}>{v.kind}</Badge><span className="text-ink-3">{formatDate(v.createdAt)}</span><span className="truncate text-ink-2">{v.changeNote}</span><span className="ml-auto flex gap-3"><button type="button" className="link" onClick={() => compare(versions[0].id, v.id)}>Compare with latest</button>{v.version !== poem.version && <button type="button" className="link" onClick={() => restore(v.id)}>Restore</button>}</span></li>))}
            </ul>
            {diff && cmp && (<div className="mt-4 rounded border rule p-4"><div className="mb-2 flex justify-between font-ui text-xs text-ink-3"><span>Latest → selected version · <span className="text-red-700">removed</span> / <span className="text-green-700">added</span></span><button type="button" className="link" onClick={() => setDiff(null)}>Close</button></div><pre className="whitespace-pre-wrap font-body text-[0.98rem] leading-relaxed">{diff.map((l, i) => <div key={i} className={l.type === "add" ? "bg-green-700/10 text-green-900 dark:text-green-300" : l.type === "del" ? "bg-red-700/10 text-red-900 line-through dark:text-red-300" : ""}>{l.text || " "}</div>)}</pre></div>)}
          </section>
        )}
      </div>

      <aside className="space-y-6 font-ui text-sm xl:sticky xl:top-6 xl:self-start">
        <div className="rounded border rule p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {form.status !== "PUBLISHED" && <button type="button" disabled={busy} onClick={() => save({ status: "PUBLISHED", changeNote: "Published" })} className={btnCls}>Publish now</button>}
            {form.status === "DRAFT" && <button type="button" disabled={busy} onClick={() => save({ status: "REVIEW" })} className={btn2Cls}>Send to review</button>}
            {form.status === "PUBLISHED" && <button type="button" disabled={busy} onClick={() => save({ status: "DRAFT", changeNote: "Unpublished" })} className={btn2Cls}>Unpublish</button>}
            <button type="button" disabled={busy} onClick={() => save()} className={btn2Cls}>Save</button>
          </div>
          {poem?.status === "PUBLISHED" && <a href={`/poems/${encodeURIComponent(poem.slug)}`} target="_blank" className="link block text-xs text-ink-3">View on site ↗</a>}
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} /> Featured on homepage</label>
        </div>
        <Field label="Status"><select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>{["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Language"><select value={form.language} onChange={(e) => set("language", e.target.value)} className={inputCls}>{[["en", "English"], ["hi", "Hindi"], ["hi-Latn", "Hindi (Roman)"], ["ur", "Urdu"], ["und", "Unknown"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Written / original date" hint="Leave empty if unknown — never guess."><input type="datetime-local" value={form.writtenAt} onChange={(e) => set("writtenAt", e.target.value)} className={inputCls} /></Field>
        <Field label="Schedule publish"><input type="datetime-local" value={form.publishAt} onChange={(e) => set("publishAt", e.target.value)} className={inputCls} /></Field>
        <Field label="Unpublish at"><input type="datetime-local" value={form.unpublishAt} onChange={(e) => set("unpublishAt", e.target.value)} className={inputCls} /></Field>
        <Field label="Collections"><div className="max-h-44 space-y-1 overflow-y-auto rounded border rule p-2">{collections.map((c) => <label key={c.id} className="flex items-center gap-2"><input type="checkbox" checked={form.collectionIds.includes(c.id)} onChange={(e) => set("collectionIds", e.target.checked ? [...form.collectionIds, c.id] : form.collectionIds.filter((x) => x !== c.id))} />{c.title}</label>)}</div></Field>
        <Field label="Tags"><div className="max-h-44 space-y-1 overflow-y-auto rounded border rule p-2">{tags.map((t) => <label key={t.id} className="flex items-center gap-2"><input type="checkbox" checked={form.tagIds.includes(t.id)} onChange={(e) => set("tagIds", e.target.checked ? [...form.tagIds, t.id] : form.tagIds.filter((x) => x !== t.id))} />{t.name} <span className="text-ink-3">{t.kind}</span></label>)}{tags.length === 0 && <span className="text-ink-3">No tags yet — create them under Tags.</span>}</div></Field>
        <Field label="Excerpt" hint="Optional. Defaults to the opening lines."><textarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={3} className={inputCls} /></Field>
        <Field label="Slug"><input value={form.slug} onChange={(e) => set("slug", e.target.value)} className={inputCls} placeholder="auto from title" /></Field>
        <Field label="SEO title"><input value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} className={inputCls} maxLength={120} /></Field>
        <Field label="Meta description"><textarea value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} rows={3} className={inputCls} maxLength={300} /></Field>
        {poem && poem.sources.length > 0 && (<div><span className="eyebrow">Provenance</span><ul className="mt-2 space-y-1.5 text-xs">{poem.sources.map((s) => <li key={s.id} className="flex flex-wrap items-center gap-2"><Badge tone={s.isCanonical ? "info" : "neutral"}>{SOURCE_LABELS[s.source]}</Badge>{s.sourceUrl ? <a href={s.sourceUrl} target="_blank" rel="noopener" className="link truncate max-w-[12rem]">{s.sourceUrl.replace(/^https?:\/\//, "")}</a> : <span className="text-ink-3">no url</span>}{s.sourcePublishedAt && <span className="text-ink-3">{formatDate(s.sourcePublishedAt, { month: "short" })}</span>}</li>)}</ul></div>)}
        <div className="rounded border rule p-3"><div className="flex items-center justify-between"><span className="eyebrow">AI assistance</span><Badge tone={ai.enabled ? "info" : "neutral"}>{ai.enabled ? "enabled" : "off"}</Badge></div><p className="mt-1 text-xs text-ink-3">Suggestions only. Nothing is applied without your approval; the poem text is never touched.</p><button type="button" onClick={suggest} className={`${btn2Cls} mt-2 text-xs`}>Suggest tags &amp; excerpt</button>
          {ai.result && (<div className="mt-3 text-xs"><Badge tone="warn">{ai.result.label}</Badge><p className="mt-2">Tags: {ai.result.data.tags.join(", ") || "—"}</p><p>Themes: {ai.result.data.themes.join(", ") || "—"}</p><p>Language: {ai.result.data.language}</p><p className="mt-1">Excerpt: <em>{ai.result.data.excerpt}</em> <button type="button" className="link" onClick={() => set("excerpt", ai.result!.data.excerpt)}>use</button></p></div>)}</div>
        {poem && <button type="button" onClick={archive} className="link text-xs text-red-700">Archive poem</button>}
      </aside>
    </div>
  );
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return (<label className="block"><span className="eyebrow">{label}</span><div className="mt-1">{children}</div>{hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}</label>); }
