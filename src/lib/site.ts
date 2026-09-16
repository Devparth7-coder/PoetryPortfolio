export const SITE = {
  name: "Dev Parth",
  title: "Dev Parth — Poetry Archive",
  tagline: "Poetry, thoughts, and the things that remained unsaid.",
  description: "The complete poetry archive of Dev Parth — poems about first love, distance, growing up, and the quiet heartbreak that changes everything.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  locale: "en_IN",
  author: { name: "Dev Parth", profiles: { poetryCom: "https://www.poetry.com/user/318517/devparth9784", myPoeticSide: "https://mypoeticside.com/user-51801" } },
};
export const abs = (path: string) => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
export const poemPath = (slug: string) => `/poems/${encodeURIComponent(slug)}`;
