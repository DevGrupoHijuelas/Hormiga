import { Check } from "lucide-react";
import AntIcon from "./AntIcon.jsx";
import { fmtDate } from "../domain/utils.js";

const STEPS = ["Enviada", "En revisión", "Lista", "En SAP"];

// Recorrido de una solicitud; la hormiga camina en el paso actual.
export default function SolTrack({ sol, small }) {
  const idx = sol.st === "pendiente" ? 1 : sol.st === "listo" ? 2 : 4;
  const exportedAt = Math.max(0, ...sol.items.map((i) => i.exportedAt || 0));
  const hint =
    sol.st === "pendiente" ? `El administrador está completando: ${sol.statusLabel.toLowerCase()}.`
    : sol.st === "listo" ? "Lista. Falta que el administrador la descargue para SAP."
    : `Cargada en SAP${exportedAt ? " el " + fmtDate(exportedAt) : ""}.`;
  return (
    <div className={"trackwrap" + (small ? " sm" : "")}>
      <ol className="track" aria-label={`Estado: ${STEPS[Math.min(idx, 3)]}`}>
        {STEPS.map((s, i) => {
          const cls = i < idx ? "done" : i === idx ? "cur" : "";
          return (
            <li key={s} className={cls} aria-current={i === idx ? "step" : undefined}>
              <span className="dot">{i < idx ? <Check size={small ? 11 : 13} strokeWidth={3} /> : i === idx ? <AntIcon size={small ? 13 : 16} /> : null}</span>
              {s}
            </li>
          );
        })}
      </ol>
      {!small && <div className="hint">{hint}</div>}
    </div>
  );
}
