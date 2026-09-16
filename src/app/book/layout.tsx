import type { Metadata } from "next";
export const metadata: Metadata = { title: "Book mode", description: "Read Dev Parth's poems as a digital anthology." };
export default function BookLayout({ children }: { children: React.ReactNode }) {
  return <div className="relative z-10 min-h-dvh bg-paper" data-book>{children}</div>;
}
