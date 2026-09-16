"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, btnCls, inputCls, Table } from "./ui";
export function TagsManager({ tags }: { tags: { id: string; name: string; slug: string; kind: string; count: number }[] }) {
  const router = useRouter(); const [name, setName] = useState(""); const [kind, setKind] = useState("theme");
  const add = async (e: React.FormEvent) => { e.preventDefault(); await fetch("/api/v1/admin/tags", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, kind }) }); setName(""); router.refresh(); };
  const del = async (id: string, n: string) => { if (!confirm(`Delete tag “${n}”?`)) return; await fetch("/api/v1/admin/tags", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) }); router.refresh(); };
  return (<>
    <form onSubmit={add} className="mb-6 flex flex-wrap gap-2 font-ui text-sm"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="New tag (e.g. Solitude)" className={inputCls + " w-64"} required /><select value={kind} onChange={(e) => setKind(e.target.value)} className={inputCls + " w-auto"}>{["theme", "mood", "form"].map((k) => <option key={k}>{k}</option>)}</select><button className={btnCls}>Add</button></form>
    <Table head={["Tag", "Kind", "Poems", ""]}>{tags.map((t) => <tr key={t.id}><td>{t.name} <span className="text-ink-3">/{t.slug}</span></td><td><Badge>{t.kind}</Badge></td><td className="tabular-nums">{t.count}</td><td className="text-right"><button type="button" className="link text-red-700" onClick={() => del(t.id, t.name)}>delete</button></td></tr>)}</Table>
  </>);
}
