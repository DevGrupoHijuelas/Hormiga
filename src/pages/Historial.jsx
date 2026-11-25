import { useState } from "react";
import { ChevronDown, ChevronUp, Download, Search, Trash2 } from "lucide-react";
import { useApp } from "../data/AppProvider.jsx";
import { COMPANIES, EMP_KEYS } from "../domain/companies.js";
import { downloadBytes, toAnsi } from "../domain/txt.js";
import { fmtDate } from "../domain/utils.js";
import { CompanyBanner, Empty, PageHeader, Segmented } from "../components/Layout.jsx";
import AntIcon from "../components/AntIcon.jsx";

function Hi({ text, q }) {
  if (!q) return text;
  const i = text.toUpperCase().indexOf(q);
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

export default function Historial({ emp, setEmp }) {
  const { hist, me, removeHist, toast } = useApp();
  const [scope, setScope] = useState("emp");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const q = search.trim().toUpperCase();
  const matches = (h) => !q || h.archivo.toUpperCase().includes(q) || (h.solicitud || "").toUpperCase().includes(q) || (h.articulos || []).some((a) => (a.code + " " + a.name).toUpperCase().includes(q));
  const list = hist.filter((h) => (scope === "all" || h.empresa === emp) && matches(h));

  function redownload(h) {
    if (!h.txt) return;
    downloadBytes(h.archivo, toAnsi(h.txt).bytes);
    toast(`Descargado de nuevo ${h.archivo}.`);
  }

  return (
    <>
      <PageHeader crumb={["Administración", "Historial"]} title="Historial de descargas" lead="Cada solicitud descargada queda registrada con su archivo y sus artículos. Busca un número de solicitud o un código para encontrarla.">
        <Segmented options={[...EMP_KEYS.map((k) => [k, COMPANIES[k].short]), ["all", "Todas"]]} value={scope === "all" ? "all" : emp} onChange={(v) => { if (v === "all") setScope("all"); else { setScope("emp"); setEmp(v); } }} />
      </PageHeader>

      {scope !== "all" && <CompanyBanner emp={emp}><span><b>{list.length}</b>descarga{list.length === 1 ? "" : "s"}</span></CompanyBanner>}

      <label className="search" style={{ maxWidth: 520 }}>
        <Search size={16} color="var(--rotulo)" />
        <input type="search" placeholder="Buscar por número de solicitud, código, descripción o archivo" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar en el historial" />
      </label>

      {list.length ? (
        <div className="hist-list">
          {list.map((h) => {
            // Al buscar, se muestran automáticamente los artículos que coinciden.
            const arts = q ? (h.articulos || []).filter((a) => (a.code + " " + a.name).toUpperCase().includes(q)) : [];
            return (
              <div className="hist-item" key={h.id}>
                <div className="hist-row">
                  <div className="fileicon">TXT</div>
                  <div style={{ minWidth: 0 }}>
                    {h.solicitud && <div className="solnum-sm">Solicitud <Hi text={h.solicitud} q={q} /></div>}
                    <div className="mono" style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}><Hi text={h.archivo} q={q} /></div>
                    <div className="when">{fmtDate(h.at)} · {h.by === me ? "Tú" : h.byName || "Administrador"}</div>
                  </div>
                  <span className={"tag emptag hide-sm emp-" + h.empresa} style={{ justifySelf: "start" }}>{COMPANIES[h.empresa]?.short || h.empresa}</span>
                  <span className="hide-sm"><b>{h.filas || 0}</b> <span className="muted">artículo{h.filas === 1 ? "" : "s"}</span></span>
                  <span className="muted hide-sm">{h.marcados ? "Marcados como exportados" : "Sin marcar"}</span>
                  <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                    <button className="sm" onClick={() => setOpen(open === h.id ? null : h.id)}>{open === h.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Artículos</button>
                    <button className="sm" disabled={!h.txt} title={h.txt ? "Descargar el mismo archivo" : "Archivo no guardado"} onClick={() => redownload(h)}><Download size={14} /></button>
                    {confirm === h.id ? (
                      <>
                        <button className="sm danger primary" onClick={() => { setConfirm(null); removeHist(h.id); toast("Registro quitado del historial."); }}>Quitar</button>
                        <button className="sm" onClick={() => setConfirm(null)}>No</button>
                      </>
                    ) : (
                      <button className="sm ghost icon-only" title="Quitar del historial" aria-label="Quitar del historial" onClick={() => setConfirm(h.id)}><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
                {(open === h.id || arts.length > 0) && (
                  <div className="hist-detail">
                    <table className="codes">
                      <thead><tr><th>#</th><th>Número de artículo</th><th>Descripción del artículo</th></tr></thead>
                      <tbody>
                        {(open === h.id ? h.articulos || [] : arts).map((a, i) => (
                          <tr key={i}><td>{i + 1}</td><td className="mono"><Hi text={a.code || "(sin código)"} q={q} /></td><td><Hi text={a.name || ""} q={q} /></td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <Empty icon={q ? Search : AntIcon} title={q ? "Sin resultados" : "Aún no hay descargas"}>
          {q ? "Ningún archivo contiene ese código o texto." : "Cuando descargues un TXT desde Exportar, quedará registrado aquí."}
        </Empty>
      )}
    </>
  );
}
