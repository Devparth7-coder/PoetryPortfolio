import type { Metadata } from "next";
import { getSessionUser } from "@/infrastructure/auth/session";
import { AdminShell } from "@/components/admin/shell";
export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  // Login page renders without shell; everything else requires a server-verified session.
  if (!user) return <div className="relative z-10 min-h-dvh">{children}</div>;
  return <AdminShell user={{ name: user.name, role: user.role }}>{children}</AdminShell>;
}
