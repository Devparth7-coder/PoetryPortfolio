"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function BookKeys({ prev, next }: { prev?: string; next?: string }) {
  const r = useRouter();
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "ArrowLeft" && prev) r.push(`/book/${encodeURIComponent(prev)}`); if (e.key === "ArrowRight" && next) r.push(`/book/${encodeURIComponent(next)}`); if (e.key === "Escape") r.push("/book"); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [prev, next, r]);
  return null;
}
