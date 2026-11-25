import { COMPANIES, DEFAULT_CONFIG, YN, GLM, BIS } from "./companies.js";
import { clone } from "./utils.js";

const has = (o, k) => Object.prototype.hasOwnProperty.call(o || {}, k);

export function normalize(col, v) {
  v = String(v ?? "").replace(/[\t\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim();
  if (col.upper) v = v.toUpperCase();
  return v;
}

// Valores finales de un artículo: lo del usuario/admin + reglas automáticas (+ cambios manuales del admin).
export function effective(item, config, skipOverride) {
  const comp = COMPANIES[item.empresa];
  const vals = item.valores || {};
  const ov = item.overrides || {};
  const r = { g: String(vals.ItemsGroupCode ?? "").trim() };
  const e = {};
  for (const col of comp.cols) {
    let v;
    if (col.who === "auto") v = col.code !== skipOverride && has(ov, col.code) ? ov[col.code] : col.f(r, e);
    else v = vals[col.code] ?? "";
    if (!v && col.def) v = (config[col.def] || {})[item.empresa] || "";
    e[col.code] = v == null ? "" : String(v);
  }
  return e;
}

export function problems(item, config, eff) {
  const comp = COMPANIES[item.empresa];
  eff = eff || effective(item, config);
  const out = [];
  for (const col of comp.cols) {
    const v = eff[col.code];
    if (col.req && !v) out.push({ code: col.code, msg: `Falta ${col.label}` });
    else if (col.max && v.length > col.max) out.push({ code: col.code, msg: `${col.label}: máximo ${col.max} caracteres` });
    else if (col.code === "ItemsGroupCode" && v && !/^\d{1,6}$/.test(v)) out.push({ code: col.code, msg: "Grupo debe ser numérico" });
  }
  return out;
}

export function status(item, config) {
  if (item.exportado) return "exportado";
  return problems(item, config).length ? "pendiente" : "listo";
}
export const ST_LABEL = { listo: "Listo", pendiente: "Pendiente admin", exportado: "Exportado" };

// Etiqueta de estado que dice qué falta ("Falta código", "Faltan 3 campos").
const SHORT = { ItemCode: "código", ItemName: "descripción", ItemsGroupCode: "grupo", U_VK_DIM2: "dimensión 2", DefaultWarehouse: "almacén" };
export function statusInfo(item, config, eff) {
  if (item.exportado) return { st: "exportado", label: "Exportado", issues: [] };
  const issues = problems(item, config, eff);
  if (!issues.length) return { st: "listo", label: "Listo", issues };
  if (issues.length === 1) {
    const p = issues[0];
    const name = SHORT[p.code] || COMPANIES[item.empresa].cols.find((c) => c.code === p.code)?.label.toLowerCase();
    return { st: "pendiente", label: p.msg.startsWith("Falta") ? `Falta ${name}` : "Revisar " + name, issues };
  }
  return { st: "pendiente", label: `Faltan ${issues.length} campos`, issues };
}

export function duplicates(items, emp, config) {
  const m = {};
  items
    .filter((i) => i.empresa === emp)
    .forEach((i) => {
      const c = effective(i, config).ItemCode;
      if (c) (m[c] = m[c] || []).push(i.id);
    });
  const d = new Set();
  Object.values(m).forEach((a) => a.length > 1 && a.forEach((x) => d.add(x)));
  return d;
}

// Aplica un valor editado. En columnas automáticas se guarda como "override" salvo que coincida con la regla.
export function applyValue(item, col, raw, config) {
  const val = normalize(col, raw);
  const it = clone(item);
  it.valores = it.valores || {};
  it.overrides = it.overrides || {};
  if (col.who === "auto") {
    const auto = effective(it, config, col.code)[col.code];
    if (val === auto) delete it.overrides[col.code];
    else it.overrides[col.code] = val;
  } else it.valores[col.code] = val;
  return it;
}

/* --- Filas en borrador (Nueva solicitud) --- */
export const userCols = (emp) => COMPANIES[emp].cols.filter((c) => c.who === "user");
export function blankRow(emp) {
  const r = {};
  userCols(emp).forEach((c) => (r[c.code] = c.init || ""));
  return r;
}
export const rowEmpty = (emp, r) => userCols(emp).filter((c) => !c.init).every((c) => !String(r[c.code] || "").trim());
export function draftProblems(emp, row, config) {
  const it = { empresa: emp, valores: row, overrides: {} };
  const users = new Set(userCols(emp).map((c) => c.code));
  return problems(it, config).filter((p) => users.has(p.code));
}

/* --- Opciones de listas desplegables --- */
export function optionsFor(col, emp, config) {
  if (col.kind === "yn") return YN.map((v) => [v, v]);
  if (col.kind === "glm") return GLM.map((v) => [v, v]);
  if (col.kind === "bis") return BIS.map((v) => [v, v]);
  if (col.kind === "group") return [["", "Elige…"], ...(config.grupos[emp] || []).map(([c, n]) => [c, `${c} · ${n}`])];
  if (col.kind === "dim") {
    const l = (config.dims[emp] || {})[col.code] || [];
    return l.length ? [["", col.req ? "Elige…" : "—"], ...l.map(([c, n]) => [c, n || c])] : null;
  }
  return null;
}

// Al pegar desde Excel, "INTERIOR" se convierte en su código "003".
export function dimCode(col, emp, v, config) {
  if (col.kind !== "dim" || !v) return v;
  const l = (config.dims[emp] || {})[col.code] || [];
  const hit = l.find(([c, n]) => c === v || (n && n.toUpperCase() === v.toUpperCase()));
  return hit ? hit[0] : v;
}

// Une la configuración guardada con la de fábrica (una lista vacía guardada no borra la de fábrica).
export function mergeConfig(stored) {
  const cfg = clone(DEFAULT_CONFIG);
  if (!stored) return cfg;
  if (stored.grupos) Object.assign(cfg.grupos, stored.grupos);
  if (stored.dims)
    Object.keys(stored.dims).forEach((k) => {
      cfg.dims[k] = cfg.dims[k] || {};
      Object.keys(stored.dims[k] || {}).forEach((d) => {
        const l = stored.dims[k][d];
        if (Array.isArray(l) && l.length) cfg.dims[k][d] = l;
      });
    });
  if (stored.almacen) Object.assign(cfg.almacen, stored.almacen);
  return cfg;
}
