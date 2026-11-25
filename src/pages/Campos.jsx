import { useState } from "react";
import { Printer } from "lucide-react";
import { useApp } from "../data/AppProvider.jsx";
import { COMPANIES } from "../domain/companies.js";
import { effective } from "../domain/rules.js";
import { PageHeader, Segmented } from "../components/Layout.jsx";

const WHO = {
  user: ["Usuario", "Lo llena quien solicita"],
  auto: ["Automático", "Regla del Excel"],
  admin: ["Administrador", "Lo completa el admin"],
};

// Valor que da la regla automática para cada grupo, agrupando los grupos con el mismo resultado.
function autoByGroup(emp, col, config) {
  const groups = (config.grupos[emp] || []).map(([c]) => c);
  const byValue = new Map();
  groups.forEach((g) => {
    const v = effective({ empresa: emp, valores: { ItemsGroupCode: g }, overrides: {} }, config)[col.code];
    byValue.set(v, [...(byValue.get(v) || []), g]);
  });
  return [...byValue.entries()];
}

function Rule({ emp, col, config }) {
  if (col.who === "auto") {
    const parts = autoByGroup(emp, col, config);
    if (parts.length === 1) return <span><code>{parts[0][0] || "(vacío)"}</code>{groupsNote(parts[0][1], emp, config)}</span>;
    return (
      <div className="rulelist">
        {parts.map(([v, gs]) => (
          <div key={v}><code>{v || "(vacío)"}</code><span className="muted"> grupo{gs.length > 1 ? "s" : ""} {gs.join(", ")}</span></div>
        ))}
      </div>
    );
  }
  if (col.kind === "group") {
    return (
      <div className="rulelist">
        {(config.grupos[emp] || []).map(([c, n]) => <div key={c}><code>{c}</code> {n}</div>)}
      </div>
    );
  }
  if (col.kind === "dim") {
    const l = (config.dims[emp] || {})[col.code] || [];
    return <div className="rulelist">{l.map(([c, n]) => <div key={c}><code>{c}</code> {n}</div>)}</div>;
  }
  const bits = [];
  if (col.who === "admin" && col.code === "ItemCode") bits.push("Código que se usará en SAP");
  if (col.def) bits.push(config[col.def]?.[emp] ? <>Por defecto <code>{config[col.def][emp]}</code> (Catálogos)</> : "Se puede fijar un valor por defecto en Catálogos");
  if (col.init) bits.push(<>Viene con <code>{col.init}</code></>);
  if (col.upper) bits.push("Se guarda en mayúsculas");
  if (col.max) bits.push(`Máximo ${col.max} caracteres`);
  return <span>{bits.map((b, i) => <span key={i}>{i > 0 && " · "}{b}</span>)}</span>;
}

function groupsNote(gs, emp, config) {
  const all = (config.grupos[emp] || []).length;
  return gs.length === all ? <span className="muted"> en todos los grupos</span> : <span className="muted"> grupos {gs.join(", ")}</span>;
}

export default function Campos() {
  const { config, empresas } = useApp();
  const [emp, setEmp] = useState(empresas[0]);
  const comp = COMPANIES[empresas.includes(emp) ? emp : empresas[0]];
  const cols = comp.cols;
  const n = (w) => cols.filter((c) => c.who === w).length;

  return (
    <>
      <PageHeader crumb={["Solicitudes", "Campos por empresa"]} title="Campos por empresa" lead="Todas las columnas de la plantilla de Excel para Data Transfer Workbench, en el mismo orden del archivo, con quién completa cada una.">
        {empresas.length > 1 && <Segmented options={empresas.map((k) => [k, COMPANIES[k].short])} value={comp.key} onChange={setEmp} />}
        <button className="noprint" onClick={() => window.print()}><Printer size={16} /> Imprimir</button>
      </PageHeader>

      <section className="card camposhead">
        <header>
          <div className={"mono-mark emp-" + comp.key} style={{ width: 46, height: 46 }}>{comp.short}</div>
          <div>
            <h3>{comp.name}</h3>
            <p className="sub">Hoja «{comp.sheet}» · {cols.length} columnas</p>
          </div>
        </header>
        <div className="kpis">
          <div className="kpi who-user"><span>Lo llena el usuario</span><b>{n("user")}</b></div>
          <div className="kpi who-auto"><span>Automáticos</span><b>{n("auto")}</b></div>
          <div className="kpi who-admin"><span>Administrador</span><b>{n("admin")}</b></div>
        </div>
        <div className="fieldstrip" aria-label="Orden de columnas">
          {cols.map((c) => <span key={c.code} className={"strip " + c.who} title={`${c.code} · ${c.label}`}>{c.label}</span>)}
        </div>
      </section>

      <section className="card flush">
        <div className="table-wrap">
          <table className="grid campos">
            <thead>
              <tr>
                <th>#</th>
                <th>Campo</th>
                <th>Quién</th>
                <th>Obligatorio</th>
                <th>Valor o regla</th>
              </tr>
            </thead>
            <tbody>
              {cols.map((c, i) => (
                <tr key={c.code} className={"w-" + c.who}>
                  <td className="num">{i + 1}</td>
                  <td className="txt"><b>{c.label}</b><small className="mono">{c.code}</small></td>
                  <td className="meta"><span className={"who " + c.who}>{WHO[c.who][0]}</span></td>
                  <td className="meta">{c.req ? "Sí" : <span className="muted">No</span>}</td>
                  <td className="txt rule"><Rule emp={comp.key} col={c} config={config} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
