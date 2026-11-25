import { useState } from "react";
import { ChevronDown, ChevronUp, Download, History, Inbox } from "lucide-react";
import { useApp } from "../data/AppProvider.jsx";
import { COMPANIES, EMP_KEYS } from "../domain/companies.js";
import { groupSolicitudes } from "../domain/solicitudes.js";
import { buildTxt, downloadBytes, fileName, toAnsi } from "../domain/txt.js";
import { fmtDate } from "../domain/utils.js";
import { CompanyBanner, Empty, PageHeader, Segmented } from "../components/Layout.jsx";
import AntIcon from "../components/AntIcon.jsx";

function Preview({ txt }) {
  return (
    <pre className="preview">
      {txt.split("\r\n").slice(0, 12).map((line, i) => (
        <span key={i}>
          {line.split("\t").map((cell, j) => <span key={j}>{j > 0 && <span className="tab">→</span>}{cell}</span>)}
          {"\n"}
        </span>
      ))}
    </pre>
  );
}

// Cada solicitud se descarga en su propio archivo; nunca se mezclan.
export default function Exportar({ emp, setEmp, go }) {
  const { items, config, persist, addHist, toast, me, session } = useApp();
  const [open, setOpen] = useState(null);

  const comp = COMPANIES[emp];
  const sols = groupSolicitudes(items.filter((i) => i.empresa === emp), config);
  const ready = sols.filter((s) => s.st === "listo" && s.num).reverse(); // la más antigua primero
  const pending = sols.filter((s) => s.st === "pendiente");

  function download(sol) {
    const arts = sol.items.filter((i) => !i.exportado);
    const txt = buildTxt(emp, arts, config);
    const name = fileName(emp, sol.num);
    const { bytes, bad } = toAnsi(txt);
    downloadBytes(name, bytes);
    const now = Date.now();
    arts.forEach((i) => persist({ ...i, exportado: true, exportedAt: now, lote: name.replace(".txt", "") }));
    addHist({
      empresa: emp, archivo: name, lote: name.replace(".txt", ""), solicitudId: sol.id, solicitud: sol.label,
      filas: arts.length, at: now, by: me, byName: session.user?.name || "", marcados: true,
      articulos: sol.rows.filter((r) => !r.item.exportado).map((r) => ({ id: r.item.id, code: r.eff.ItemCode || "", name: r.eff.ItemName || "" })),
      txt: txt.length < 400000 ? txt : "",
    });
    toast(`Solicitud ${sol.label} descargada en ${name}.` + (bad ? ` ${bad} carácter(es) sin equivalente ANSI se cambiaron por “?”.` : ""));
  }

  return (
    <>
      <PageHeader crumb={["Administración", "Exportar TXT"]} title="Exportar por solicitud" lead={`Cada solicitud completa se descarga en su propio TXT (ANSI, tabulado, CRLF) con las dos filas de encabezado de la hoja «${comp.sheet}».`}>
        <Segmented options={EMP_KEYS.map((k) => [k, COMPANIES[k].short])} value={emp} onChange={(k) => { setEmp(k); setOpen(null); }} />
        <button onClick={() => go("hist")}><History size={16} /> Historial</button>
      </PageHeader>

      <CompanyBanner emp={emp} />

      <div className="kpis">
        <div className="kpi"><span>Listas para descargar</span><b>{ready.length}</b></div>
        <div className="kpi"><span>Incompletas</span><b>{pending.length}</b></div>
      </div>

      {ready.length ? (
        <div className="sol-list">
          {ready.map((sol) => {
            const arts = sol.rows.filter((r) => !r.item.exportado);
            return (
              <div className="solcard" key={sol.id}>
                <header>
                  <div className="fileicon">TXT</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="row" style={{ gap: 8 }}><span className="solnum">{sol.label}</span><span className="pill listo">Lista</span></div>
                    <div className="muted" style={{ marginTop: 3 }}>
                      {sol.createdByName ? sol.createdByName.split("@")[0] + " · " : ""}{fmtDate(sol.createdAt)} · {arts.length} artículo{arts.length > 1 ? "s" : ""} · <span className="mono">{fileName(emp, sol.num)}</span>
                    </div>
                  </div>
                  <button className="sm" onClick={() => setOpen(open === sol.id ? null : sol.id)}>{open === sol.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Vista previa</button>
                  <button className="primary" onClick={() => download(sol)}><Download size={16} /> Descargar TXT</button>
                </header>
                <div className="arts">
                  {arts.map((r) => <span className="tag" key={r.item.id}><span className="mono">{r.eff.ItemCode}</span> · {r.eff.ItemName}</span>)}
                </div>
                {open === sol.id && <Preview txt={buildTxt(emp, arts.map((r) => r.item), config)} />}
              </div>
            );
          })}
        </div>
      ) : (
        <Empty icon={pending.length ? Inbox : AntIcon} title="No hay solicitudes listas" action={pending.length ? <button onClick={() => go("admin", emp)}>Ir a la Bandeja</button> : null}>
          {pending.length ? `Hay ${pending.length} solicitud${pending.length > 1 ? "es" : ""} de ${comp.short} por completar.` : `Cuando una solicitud de ${comp.short} tenga todos sus artículos completos, podrás descargarla aquí.`}
        </Empty>
      )}

      {pending.length > 0 && ready.length > 0 && (
        <>
          <h3 className="section-title">Todavía incompletas</h3>
          <div className="sol-list">
            {pending.map((sol) => (
              <div className="solcard dashed" key={sol.id}>
                <header>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="row" style={{ gap: 8 }}><span className="solnum">{sol.label}</span><span className="pill pendiente">{sol.statusLabel}</span></div>
                    <div className="muted" style={{ marginTop: 3 }}>{sol.createdByName ? sol.createdByName.split("@")[0] + " · " : ""}{fmtDate(sol.createdAt)} · {sol.items.length} artículo{sol.items.length > 1 ? "s" : ""}</div>
                  </div>
                  <button className="sm" onClick={() => go("admin", emp)}>Completar en la Bandeja</button>
                </header>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
