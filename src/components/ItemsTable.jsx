import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useApp } from "../data/AppProvider.jsx";
import { COMPANIES } from "../domain/companies.js";
import { applyValue, effective, optionsFor, statusInfo } from "../domain/rules.js";
import { ColumnHeader, ItemCell } from "./Cells.jsx";
import { StatusPill } from "./Layout.jsx";

// Tabla de las solicitudes del usuario: puede corregir sus campos amarillos hasta que se exporten.
export default function ItemsTable({ emp, items }) {
  const { config, persist, removeItems, toast } = useApp();
  const [confirmDel, setConfirmDel] = useState(null);
  const cols = COMPANIES[emp].cols.filter((c) => c.who === "user" || c.code === "ItemCode");
  const display = (c, v) => { const o = optionsFor(c, emp, config); return (o && o.find((x) => x[0] === v)?.[1]) || v; };

  return (
    <div className="table-wrap">
      <table className="grid">
        <thead>
          <tr>
            <th>Estado</th>
            {cols.map((c) => <ColumnHeader key={c.code} col={c} />)}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const eff = effective(it, config);
            const info = statusInfo(it, config, eff);
            return (
              <tr key={it.id}>
                <td className="meta"><StatusPill info={info.st === "exportado" ? { ...info, label: "Cargado en SAP" } : { st: "revision", label: "En revisión", issues: [] }} /></td>
                {cols.map((c) => {
                  const canEdit = !it.exportado && c.who === "user";
                  if (!canEdit)
                    return <td key={c.code} className={"txt " + (c.code === "ItemCode" ? "mono" : "")}>{display(c, eff[c.code]) || <span className="muted" style={{ fontFamily: "var(--f)" }}>Lo asigna el admin</span>}</td>;
                  return (
                    <td key={c.code} className={"u c-" + c.code}>
                      <ItemCell col={c} emp={emp} config={config} value={eff[c.code]} onCommit={(v) => persist(applyValue(it, c, v, config))} />
                    </td>
                  );
                })}
                <td className="meta">
                  {!it.exportado &&
                    (confirmDel === it.id ? (
                      <>
                        <button className="sm danger primary" onClick={() => { setConfirmDel(null); removeItems([it.id]); toast("Solicitud eliminada."); }}>Eliminar</button>{" "}
                        <button className="sm" onClick={() => setConfirmDel(null)}>No</button>
                      </>
                    ) : (
                      <button className="ghost icon-only" title="Eliminar solicitud" aria-label="Eliminar solicitud" onClick={() => setConfirmDel(it.id)}><Trash2 size={15} /></button>
                    ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
