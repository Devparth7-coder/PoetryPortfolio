import localFont from "next/font/local";
export const fraunces = localFont({
  src: [
    { path: "../fonts/fraunces-normal-300-700-latin.woff2", weight: "300 700", style: "normal" },
    { path: "../fonts/fraunces-italic-300-700-latin.woff2", weight: "300 700", style: "italic" },
  ], variable: "--font-fraunces", display: "swap", preload: true, fallback: ["Georgia", "serif"],
});
export const newsreader = localFont({
  src: [
    { path: "../fonts/newsreader-normal-300-600-latin.woff2", weight: "300 600", style: "normal" },
    { path: "../fonts/newsreader-italic-300-600-latin.woff2", weight: "300 600", style: "italic" },
  ], variable: "--font-newsreader", display: "swap", preload: true, fallback: ["Georgia", "serif"],
});
export const inter = localFont({
  src: [
    { path: "../fonts/inter-normal-400-latin.woff2", weight: "400", style: "normal" },
    { path: "../fonts/inter-normal-500-latin.woff2", weight: "500", style: "normal" },
    { path: "../fonts/inter-normal-600-latin.woff2", weight: "600", style: "normal" },
  ], variable: "--font-inter", display: "swap", preload: false, fallback: ["system-ui", "sans-serif"],
});
