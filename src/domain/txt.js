import { COMPANIES } from "./companies.js";
import { effective } from "./rules.js";

// TXT para Data Transfer Workbench: tabulado, dos filas de encabezado (códigos y descripciones), CRLF.
export function buildTxt(emp, items, config) {
  const cols = COMPANIES[emp].cols;
  const clean = (v) => String(v ?? "").replace(/[\t\r\n]+/g, " ").trim();
  const lines = [cols.map((c) => c.code).join("\t"), cols.map((c) => c.label).join("\t")];
  items.forEach((it) => {
    const e = effective(it, config);
    lines.push(cols.map((c) => clean(e[c.code])).join("\t"));
  });
  return lines.join("\r\n") + "\r\n";
}

// Caracteres de Windows-1252 fuera de Latin-1.
const CP1252 = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88,
  0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
  0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
  0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

// Codifica en ANSI (Windows-1252). Lo que no tiene equivalente se cambia por "?".
export function toAnsi(str) {
  const out = new Uint8Array(str.length);
  let bad = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x80 || (c >= 0xa0 && c <= 0xff)) out[i] = c;
    else if (CP1252[c]) out[i] = CP1252[c];
    else {
      out[i] = 0x3f;
      bad++;
    }
  }
  return { bytes: out, bad };
}

// OITM_HG_SOL-0007_20261124.txt (con número de solicitud) u OITM_HG_20261124_1012.txt (sin número).
export function fileName(emp, num, d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  const day = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  return num ? `OITM_${emp}_SOL-${String(num).padStart(4, "0")}_${day}.txt` : `OITM_${emp}_${day}_${p(d.getHours())}${p(d.getMinutes())}.txt`;
}

export function downloadBytes(name, bytes) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([bytes], { type: "text/plain" }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}
