/**
 * Dependency-free PDF writer producing a book-like single/multi-page layout with core Type1 fonts
 * (Times-Roman / Times-Italic). WinAnsi encoding; curly quotes & dashes are mapped.
 */
const A4 = { w: 595.28, h: 841.89 };
const M = { top: 96, bottom: 80, left: 86, right: 86 };

function winAnsi(s: string) {
  return s.replace(/\u2018|\u2019|\u201a/g, "'").replace(/\u201c|\u201d|\u201e/g, '"').replace(/\u2013/g, "-").replace(/\u2014/g, "--").replace(/\u2026/g, "...").replace(/\u00a0/g, " ").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}
function esc(s: string) { return winAnsi(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); }
function wrap(line: string, maxChars: number): string[] {
  if (line.length <= maxChars) return [line]; const words = line.split(" "); const out: string[] = []; let cur = "";
  for (const w of words) { if ((cur + " " + w).trim().length > maxChars && cur) { out.push(cur); cur = "    " + w; } else cur = (cur ? cur + " " : "") + w; }
  if (cur) out.push(cur); return out;
}

export function renderPoemPdf(o: { title: string; body: string; author: string; date: string; footer: string }): Buffer {
  const bodySize = 12, leading = 19, titleSize = 26;
  const maxChars = Math.floor((A4.w - M.left - M.right) / (bodySize * 0.5));
  const lines = o.body.split("\n").flatMap((l) => wrap(l, maxChars));
  const pages: string[][] = []; let cur: string[] = []; let y = A4.h - M.top;
  const push = (cmd: string) => cur.push(cmd);
  const newPage = () => { if (cur.length) pages.push(cur); cur = []; y = A4.h - M.top; };
  // title block
  push(`BT /F1 ${titleSize} Tf ${M.left} ${y} Td (${esc(o.title)}) Tj ET`); y -= titleSize * 1.15;
  push(`BT /F2 10.5 Tf ${M.left} ${y} Td 0.42 0.35 0.3 rg (${esc(o.author + (o.date ? "  ·  " + o.date : ""))}) Tj ET`); y -= 34;
  push(`0.85 0.8 0.74 RG 0.6 w ${M.left} ${y} m ${M.left + 40} ${y} l S`); y -= 30;
  for (const l of lines) {
    if (y < M.bottom + leading) { newPage(); }
    if (l.trim()) push(`BT /F1 ${bodySize} Tf ${M.left} ${y} Td 0.11 0.1 0.09 rg (${esc(l)}) Tj ET`);
    y -= leading;
  }
  newPage();
  const total = pages.length;
  const objs: string[] = []; const add = (s: string) => { objs.push(s); return objs.length; };
  const fontR = add("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>");
  const fontI = add("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic /Encoding /WinAnsiEncoding >>");
  const pagesId = objs.length + 1 + pages.length * 2; // placeholder index computed after
  const pageIds: number[] = [];
  const contentIds: number[] = [];
  pages.forEach((cmds, i) => {
    const footer = `BT /F2 8.5 Tf ${M.left} ${M.bottom - 30} Td 0.52 0.49 0.45 rg (${esc(o.footer)}) Tj ET BT /F2 8.5 Tf ${A4.w - M.right - 30} ${M.bottom - 30} Td (${i + 1} / ${total}) Tj ET`;
    const stream = ["1 1 1 rg", ...cmds, footer].join("\n");
    contentIds.push(add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`));
    pageIds.push(objs.length + 1); objs.push(""); // reserve
  });
  const pagesObjId = add(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${total} >>`);
  pageIds.forEach((id, i) => { objs[id - 1] = `<< /Type /Page /Parent ${pagesObjId} 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /Font << /F1 ${fontR} 0 R /F2 ${fontI} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`; });
  const catalog = add(`<< /Type /Catalog /Pages ${pagesObjId} 0 R >>`);
  const info = add(`<< /Title (${esc(o.title)}) /Author (${esc(o.author)}) /Creator (Dev Parth Poetry Archive) >>`);
  void pagesId;
  let out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"; const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(Buffer.byteLength(out, "latin1")); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((x) => String(x).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, "latin1");
}
