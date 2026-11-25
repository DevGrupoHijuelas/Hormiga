import { useState } from "react";
import { RotateCcw, Trash2, Undo2, X } from "lucide-react";
import { useApp } from "../data/AppProvider.jsx";
import { COMPANIES } from "../domain/companies.js";
import { applyValue, effective, statusInfo } from "../domain/rules.js";
import { fmtDate } from "../domain/utils.js";
import { ItemCell } from "./Cells.jsx";
import { StatusPill } from "./Layout.jsx";

const has = (o, k) => Object.prototype.hasOwnProperty.call(o || {}, k);
const GROUPS = [
  ["user", "Datos del usuario", "i-user"],
  ["admin", "Completa el administrador", "i-admin"],
  ["auto", "Automáticos (reglas del Excel)", "i-auto"],
];

// Panel con todos los campos de un artículo, editable por el administrador.
export default function ItemDrawer({ item, dupCodes, onClose }) {
  const { config, persist, removeItems, toast } = useApp();
  const [confirm, setConfirm] = useState(false);
  const comp = COMPANIES[item.empresa];
  const eff = effective(item, config);
  const info = statusInfo(item, config, eff);
  const bad = new Set(info.issues.map((p) => p.code));
  const dup = dupCodes.has(item.id);
  if (dup) bad.add("ItemCode");

  return (
    <aside className="drawer" aria-label="Detalle del artículo">
      <header>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="row" style={{ gap: 8 }}>
            <StatusPill info={info} />
            <span className="muted">{comp.short}{item.lote ? ` · ${item.lote}` : ""}</span>
          </div>
          <h3>{eff.ItemName || "(sin descripción)"}</h3>
          <div className="muted" style={{ marginTop: 4 }}>
            {item.createdByName || "Usuario"} · {fmtDate(item.createdAt)}
          </div>
        </div>
        <button className="ghost icon-only" aria-label="Cerrar detalle" onClick={onClose}><X size={18} /></button>
      </header>
      <div className="body">
        {(info.issues.length > 0 || dup) && (
          <ul className="issues" style={{ marginTop: 12 }}>
            {info.issues.map((p) => <li key={p.code}>{p.msg}</li>)}
            {dup && <li>El número de artículo está repetido en otra solicitud</li>}
          </ul>
        )}
        {GROUPS.map(([who, title, swatch]) => {
          const cols = comp.cols.filter((c) => c.who === who);
          if (!cols.length) return null;
          return (
            <div key={who}>
              <div className="group-title"><i className={swatch} style={{ border: "1px solid var(--linea-peso)" }} />{title}</div>
              {cols.map((c) => {
                const ov = who === "auto" && has(item.overrides, c.code);
                return (
                  <div key={c.code} className={"kv " + (who === "user" ? "u " : "") + (ov ? "ov " : "") + (bad.has(c.code) ? "bad" : "")}>
                    <div className="k">{c.label}{c.req ? " *" : ""}<span className="code">{c.code}</span></div>
                    <div className="v">
                      <ItemCell col={c} emp={item.empresa} config={config} value={eff[c.code]} onCommit={(v) => persist(applyValue(item, c, v, config))} />
                    </div>
                    <div>
                      {ov && (
                        <button className="ghost icon-only" title="Volver al valor automático" aria-label="Volver al valor automático"
                          onClick={() => { const o = { ...item.overrides }; delete o[c.code]; persist({ ...item, overrides: o }); }}>
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <footer>
        {item.exportado && (
          <button className="sm" onClick={() => persist({ ...item, exportado: false, exportedAt: null, lote: null })}><Undo2 size={14} /> Marcar sin exportar</button>
        )}
        <span className="spacer" />
        {confirm ? (
          <>
            <button className="sm danger primary" onClick={() => { removeItems([item.id]); toast("Artículo eliminado."); onClose(); }}>Confirmar eliminación</button>
            <button className="sm" onClick={() => setConfirm(false)}>Cancelar</button>
          </>
        ) : (
          <button className="sm danger" onClick={() => setConfirm(true)}><Trash2 size={14} /> Eliminar</button>
        )}
      </footer>
    </aside>
  );
}
