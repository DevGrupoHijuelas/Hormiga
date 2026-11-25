import { FileDown, FilePlus2, Inbox, ListChecks } from "lucide-react";
import { useApp } from "../data/AppProvider.jsx";
import { COMPANIES, EMP_KEYS } from "../domain/companies.js";
import { groupSolicitudes } from "../domain/solicitudes.js";
import { fmtDate } from "../domain/utils.js";
import AntIcon from "../components/AntIcon.jsx";
import SolTrack from "../components/SolTrack.jsx";
import { Empty } from "../components/Layout.jsx";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
}
function firstName(name) {
  const w = (name || "").split("@")[0].split(/[\s._-]+/).filter(Boolean)[0] || "";
  return w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : "";
}
function Recent({ sols, title, isAdmin }) {
  return (
    <section className="card">
      <header><h3>{title}</h3></header>
      <div className="recent">
        {sols.map((s) => (
          <div className="ritem" key={s.id}>
            <div className="rhead">
              <div className={"mono-mark emp-" + s.emp} style={{ width: 34, height: 34, fontSize: 11 }}>{COMPANIES[s.emp].short}</div>
              <b>{s.label}</b>
              <span className="muted">{s.createdByName && isAdmin ? s.createdByName.split("@")[0] + " · " : ""}{fmtDate(s.createdAt)} · {s.items.length} artículo{s.items.length > 1 ? "s" : ""}</span>
            </div>
            <SolTrack sol={s} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Inicio({ go }) {
  const { items, config, empresas, isAdmin, me, session } = useApp();
  const name = firstName(session.user?.name);
  const visible = items.filter((i) => empresas.includes(i.empresa) && (isAdmin || i.createdBy === me));
  const sols = groupSolicitudes(visible, config);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const enSapMes = visible.filter((i) => i.exportado && (i.exportedAt || 0) >= monthStart).length;
  const count = (emp, st) => sols.filter((s) => s.emp === emp && s.st === st).length;
  const pend = sols.filter((s) => s.st === "pendiente").length;
  const listas = sols.filter((s) => s.st === "listo").length;

  const lead = isAdmin
    ? pend + listas
      ? `Tienes ${pend} solicitud${pend === 1 ? "" : "es"} por completar y ${listas} lista${listas === 1 ? "" : "s"} para descargar. Este mes se cargaron ${enSapMes} artículo${enSapMes === 1 ? "" : "s"} en SAP.`
      : `Todo al día. Este mes se cargaron ${enSapMes} artículo${enSapMes === 1 ? "" : "s"} en SAP.`
    : sols.length
      ? `Tienes ${pend + listas} solicitud${pend + listas === 1 ? "" : "es"} en revisión y ${sols.filter((s) => s.st === "exportado").length} cargada${sols.filter((s) => s.st === "exportado").length === 1 ? "" : "s"} en SAP.`
      : "Aquí verás cómo avanzan tus solicitudes, paso a paso.";

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="crumb">{new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}</div>
          <h2 className="hello">{greeting()}{name ? `, ${name}` : ""}</h2>
          <p className="lead">{lead}</p>
        </div>
        <div className="actions">
          {!isAdmin && sols.length > 0 && <button onClick={() => go("mias")}><ListChecks size={16} /> Mis solicitudes</button>}
          <button className="primary" onClick={() => go("nuevo")}><FilePlus2 size={16} /> Nueva solicitud</button>
        </div>
      </div>

      {isAdmin && (
        <div className="empcards">
          {EMP_KEYS.filter((k) => empresas.includes(k)).map((k) => {
            const c = COMPANIES[k];
            const p = count(k, "pendiente"), l = count(k, "listo");
            const sap = visible.filter((i) => i.empresa === k && i.exportado && (i.exportedAt || 0) >= monthStart).length;
            return (
              <div className={"empcard emp-" + k} key={k}>
                <div className="top">
                  <div className={"mono-mark emp-" + k} style={{ width: 38, height: 38, fontSize: 12 }}>{c.short}</div>
                  <div><b>{c.name}</b><small>{c.sheet}</small></div>
                </div>
                <div className="nums">
                  <div className={p ? "warn" : ""}><span>Completar</span><b>{p}</b></div>
                  <div className={l ? "ok" : ""}><span>Listas</span><b>{l}</b></div>
                  <div><span>SAP mes</span><b>{sap}</b></div>
                </div>
                <footer>
                  <button className="sm" onClick={() => go("admin", k)}><Inbox size={14} /> Bandeja</button>
                  {l > 0 && <button className="sm primary" onClick={() => go("export", k)}><FileDown size={14} /> Exportar {l}</button>}
                </footer>
              </div>
            );
          })}
        </div>
      )}

      {sols.length ? (
        <Recent sols={sols.slice(0, 6)} title={isAdmin ? "Últimas solicitudes" : "Tus últimas solicitudes"} isAdmin={isAdmin} />
      ) : (
        <Empty icon={AntIcon} title={isAdmin ? "Todavía no llegan solicitudes" : "Crea tu primera solicitud"} action={<button className="primary" onClick={() => go("nuevo")}><FilePlus2 size={16} /> Nueva solicitud</button>}>
          {isAdmin ? "Cuando alguien envíe artículos, aparecerán aquí con su avance." : "Elige la empresa, completa los campos amarillos y envíala. Aquí verás cómo avanza."}
        </Empty>
      )}
    </>
  );
}
