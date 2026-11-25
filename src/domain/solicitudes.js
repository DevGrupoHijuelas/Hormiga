import { COMPANIES } from "./companies.js";
import { effective, statusInfo } from "./rules.js";

// Una solicitud = los artículos que un usuario envió juntos. Se numeran con un correlativo por empresa.
export const pad4 = (n) => String(n).padStart(4, "0");
export const solicitudId = (emp, n) => `${emp}-${pad4(n)}`;
export const solicitudLabel = (emp, n) => (n ? `${COMPANIES[emp]?.short || emp}-${pad4(n)}` : "Sin número");

// Artículos enviados antes de existir el número: se agrupan por empresa, usuario y momento de envío
// (los de un mismo envío se guardaron con milisegundos consecutivos).
export function legacyKey(items) {
  const keys = new Map();
  const old = items.filter((i) => !i.solicitudId).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const last = {};
  old.forEach((i) => {
    const k = `${i.empresa}|${i.createdBy}`;
    const prev = last[k];
    if (prev && (i.createdAt || 0) - (prev.at || 0) <= 50) {
      prev.at = i.createdAt || 0;
      keys.set(i.id, prev.key);
    } else {
      last[k] = { at: i.createdAt || 0, key: `old-${i.empresa}-${i.createdBy}-${i.createdAt || 0}` };
      keys.set(i.id, last[k].key);
    }
  });
  return keys;
}

// Agrupa artículos en solicitudes, de la más reciente a la más antigua.
export function groupSolicitudes(items, config) {
  const legacy = legacyKey(items);
  const map = new Map();
  items.forEach((i) => {
    const id = i.solicitudId || legacy.get(i.id);
    if (!map.has(id)) map.set(id, { id, emp: i.empresa, num: i.solicitudNum || 0, createdBy: i.createdBy, createdByName: i.createdByName || "", createdAt: i.createdAt || 0, items: [] });
    const s = map.get(id);
    s.items.push(i);
    s.createdAt = Math.min(s.createdAt || Infinity, i.createdAt || 0);
  });
  return [...map.values()]
    .map((s) => {
      s.items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      s.label = solicitudLabel(s.emp, s.num);
      Object.assign(s, solicitudStatus(s.items, config));
      return s;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

// Estado de la solicitud completa (st y statusLabel): exportada, lista (todos sus artículos completos) o pendiente (dice qué falta).
export function solicitudStatus(items, config) {
  const infos = items.map((i) => ({ item: i, eff: effective(i, config), info: statusInfo(i, config) }));
  const open = infos.filter((x) => !x.item.exportado);
  if (!open.length) return { st: "exportado", statusLabel: "Exportada", rows: infos };
  const bad = open.filter((x) => x.info.st === "pendiente");
  if (!bad.length) return { st: "listo", statusLabel: "Lista", rows: infos };
  const same = bad.every((x) => x.info.label === bad[0].info.label);
  const n = items.length;
  const label = n === 1 ? bad[0].info.label : same ? `${bad[0].info.label} en ${bad.length} de ${n}` : `${bad.length} de ${n} incompletos`;
  return { st: "pendiente", statusLabel: label, rows: infos };
}
