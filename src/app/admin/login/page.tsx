import { redirect } from "next/navigation";
import { getSessionUser } from "@/infrastructure/auth/session";
import { LoginForm } from "@/components/admin/login-form";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSessionUser()) redirect("/admin");
  const { next } = await searchParams;
  return (<main id="main" className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6"><p className="eyebrow">Dev Parth · Archive</p><h1 className="mt-3 font-display text-[2rem] tracking-tight">Editorial sign in</h1><LoginForm next={next && next.startsWith("/admin") ? next : "/admin"} /></main>);
}
