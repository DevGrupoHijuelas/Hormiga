import { ChevronRight } from "lucide-react";
import AntIcon from "./AntIcon.jsx";
import { COMPANIES } from "../domain/companies.js";

// Encabezado de cada página: ruta, título, descripción y acciones a la derecha.
export function PageHeader({ crumb, title, lead, children }) {
  return (
    <div className="pagehead">
      <div>
        {crumb && (
          <div className="crumb">
            {crumb.map((c, i) => (
              <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                {i > 0 && <ChevronRight size={12} />}
                {c}
              </span>
            ))}
          </div>
        )}
        <h2>{title}</h2>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {children && <div className="actions">{children}</div>}
    </div>
  );
}

// Estado vacío con ícono, título, texto y una acción.
export function Empty({ icon: Icon, title, children, action }) {
  return (
    <div className="empty">
      {Icon && (
        <div className={"ic" + (Icon === AntIcon ? " ant" : "")}>
          <Icon size={22} strokeWidth={1.6} />
        </div>
      )}
      {title && <h3>{title}</h3>}
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

// Esqueleto de carga.
export function Skeleton() {
  return (
    <div className="skeleton" aria-label="Cargando">
      <div className="sk" style={{ height: 14, width: 140 }} />
      <div className="sk" style={{ height: 30, width: 320 }} />
      <div className="kpis">
        {[0, 1, 2].map((i) => (
          <div key={i} className="sk" style={{ height: 78 }} />
        ))}
      </div>
      <div className="sk" style={{ height: 260 }} />
    </div>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map(([v, label]) => (
        <button key={v} className={(value === v ? "on " : "") + (COMPANIES[v] ? "emp-" + v : "")} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function StatusPill({ info }) {
  return (
    <span className={"pill " + info.st} title={info.issues.map((p) => p.msg).join("\n")}>
      {info.label}
    </span>
  );
}

// Franja con el color de la empresa, para no confundirse de empresa al trabajar.
export function CompanyBanner({ emp, children }) {
  const c = COMPANIES[emp];
  return (
    <div className={"empbanner emp-" + emp}>
      <div className={"mono-mark emp-" + emp} style={{ width: 38, height: 38, fontSize: 12 }}>{c.short}</div>
      <div>
        <b>{c.name}</b>
        <small>Hoja «{c.sheet}»</small>
      </div>
      {children && <div className="facts">{children}</div>}
    </div>
  );
}
