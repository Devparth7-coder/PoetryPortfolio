import { db } from "@/infrastructure/db/client"; import { settings, adminUsers } from "@/infrastructure/db/schema";
import { PageTitle, Table, Badge } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdmin } from "@/infrastructure/auth/session";
export default async function Settings() {
  const user = await requireAdmin("VIEWER"); const rows = await db.select().from(settings); const users = await db.select({ id: adminUsers.id, email: adminUsers.email, name: adminUsers.name, role: adminUsers.role, isActive: adminUsers.isActive, lastLoginAt: adminUsers.lastLoginAt }).from(adminUsers);
  const get = (k: string) => (rows.find((r) => r.key === k)?.value ?? {}) as Record<string, unknown>;
  return (<><PageTitle eyebrow="Configuration" title="Settings" /><SettingsForm site={get("site")} book={get("book")} canEdit={user.role !== "VIEWER"} />
    <h2 className="eyebrow mt-12 mb-3">Editorial users</h2><Table head={["Name", "Email", "Role", "Active", "Last login"]}>{users.map((u) => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td><Badge tone="info">{u.role}</Badge></td><td>{u.isActive ? "yes" : "no"}</td><td className="text-ink-3">{u.lastLoginAt?.toISOString().slice(0, 16).replace("T", " ") ?? "—"}</td></tr>)}</Table><p className="mt-2 font-ui text-xs text-ink-3">Add users with <code>npm run db:seed</code> (first owner) or directly via SQL/`scripts/add-admin.ts`. Passwords are bcrypt-hashed (cost 12).</p>
    <h2 className="eyebrow mt-12 mb-3">Environment</h2><ul className="font-ui text-sm text-ink-2 space-y-1"><li>Storage driver: <code>{process.env.STORAGE_DRIVER ?? "local"}</code></li><li>AI provider: <code>{process.env.AI_PROVIDER ?? "none"}</code> {(process.env.AI_PROVIDER ?? "none") === "none" && <span className="text-ink-3">— AI features are off; the archive works fully without them.</span>}</li><li>Comments: <code>disabled</code> (by design)</li><li>Cron secret: <code>{process.env.CRON_SECRET ? "set" : "not set"}</code> — needed for scheduled publishing</li></ul></>);
}
