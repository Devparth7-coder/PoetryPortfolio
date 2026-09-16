import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "Dev Parth — Poetry Archive", short_name: "Dev Parth", description: "Poetry, thoughts, and the things that remained unsaid.", start_url: "/", display: "standalone", background_color: "#f6f1e8", theme_color: "#f6f1e8", lang: "en", categories: ["books", "education"], icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }, { src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }], shortcuts: [{ name: "Read something unexpected", url: "/random" }, { name: "All poems", url: "/poems" }, { name: "Your library", url: "/library" }] };
}
