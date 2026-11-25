export const clone = (o) => JSON.parse(JSON.stringify(o));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
export function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
}

export function fmtDate(t) {
  if (!t) return "";
  const d = new Date(t);
  return (
    d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" }) +
    " " +
    d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
  );
}

// Listas de catálogo <-> texto "código | nombre" (una por línea)
export const listToText = (l) => (l || []).map(([c, n]) => (n ? `${c} | ${n}` : c)).join("\n");
export const textToList = (t) =>
  t
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [c, ...n] = l.split("|");
      return [c.trim(), n.join("|").trim()];
    });

export const plural = (n, one, many) => (n === 1 ? one : many);
