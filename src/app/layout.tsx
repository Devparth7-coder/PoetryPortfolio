import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fraunces, newsreader, inter } from "./fonts";
import { SITE } from "@/lib/site";
import { ThemeScript } from "@/components/site/theme-script";
import { CommandPalette } from "@/components/site/command-palette";
import { PwaRegister } from "@/components/site/pwa-register";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: "%s — Dev Parth" },
  description: SITE.description,
  applicationName: SITE.title,
  authors: [{ name: SITE.author.name, url: SITE.url }],
  creator: SITE.author.name,
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/", types: { "application/rss+xml": [{ url: "/rss.xml", title: "Dev Parth — Poetry" }] } },
  openGraph: { type: "website", siteName: SITE.title, locale: SITE.locale, url: SITE.url, title: SITE.title, description: SITE.description, images: [{ url: "/og", width: 1200, height: 630, alt: "Dev Parth — Poetry Archive" }] },
  twitter: { card: "summary_large_image", title: SITE.title, description: SITE.description, images: ["/og"] },
  robots: { index: true, follow: true },
  appleWebApp: { capable: true, title: "Dev Parth", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], apple: "/apple-touch-icon.png" },
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f6f1e8" }, { media: "(prefers-color-scheme: dark)", color: "#121110" }], width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fraunces.variable} ${newsreader.variable} ${inter.variable}`}>
      <head><ThemeScript /></head>
      <body className="bg-paper text-ink">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-paper focus:px-4 focus:py-2 focus:font-ui focus:text-sm focus:shadow">Skip to content</a>
        <div className="atmosphere" aria-hidden="true" />
        {children}
        <CommandPalette />
        <PwaRegister />
      </body>
    </html>
  );
}
