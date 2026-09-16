"use client";
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (<html lang="en"><body style={{ fontFamily: "Georgia, serif", background: "#f6f1e8", color: "#1d1a17", textAlign: "center", padding: "6rem 1rem" }}><h1>Something went wrong.</h1><p><button onClick={reset} style={{ textDecoration: "underline", background: "none", border: 0, font: "inherit", cursor: "pointer" }}>Try again</button></p></body></html>);
}
