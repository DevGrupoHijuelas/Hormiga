import { useEffect, useMemo, useState } from "react";
import { CircleCheck, CircleDashed, FileDown, Inbox, KanbanSquare, List, PackageCheck, PanelRightOpen, PencilLine, Search } from "lucide-react";
import { useApp } from "../data/AppProvider.jsx";
import { COMPANIES, EMP_KEYS } from "../domain/companies.js";
import { applyValue, duplicates, effective, optionsFor, statusInfo } from "../domain/rules.js";
import { fmtDate, lsGet, lsSet } from "../domain/utils.js";
import { groupSolicitudes } from "../domain/solicitudes.js";
import { CompanyBanner, Empty, PageHeader, Segmented, StatusPill } from "../components/Layout.jsx";
import AntIcon from "../components/AntIcon.jsx";
import ItemDrawer from "../components/ItemDrawer.jsx";
import { ItemCell } from "../components/Cells.jsx";

const FILTERS = [
  ["activos", "Sin exportar"],
  ["pendiente", "Pendientes"],
  ["listo", "Listas"],
  ["exportado", "Exportadas"],
  ["todos", "Todas"],
];

const COLS = [
  ["pendiente", "Por completar"],
  ["listo", "Listas"],
  ["exportado", "En SAP"],
];

// Vista de tablero: una columna por estado, una tarjeta por solicitud.
function Board({ sols, go, emp, openInList }) {
  const [showAll, setShowAll] = useState(false);
  return (
    <div className="board">
      {COLS.map(([st, title]) => {
        const all = sols.filter((s) => s.st === st);
        const shown = st === "exportado" && !showAll ? all.slice(0, 6) : all;
        return (
          <section key={st} className={"bcol " + st}>
            <header>{title}<span className="n">{all.length}</span></header>
            <div className="cards">
              {shown.map((s) => (
                <div className="bcard" key={s.id}>
                  <div className="top"><b>{s.label}</b><span className="spacer" /><span className="muted">{s.items.length} art.</span></div>
                  <div className="muted">{s.createdByName ? s.createdByName.split("@")[0] + " · " : ""}{fmtDate(s.createdAt)}</div>
                  <div className="names" title={s.rows.map((r) => r.eff.ItemName).join("\n")}>{s.rows.map((r) => r.eff.ItemName).filter(Boolean).join(" · ") || "Sin descripción"}</div>
                  {st === "pendiente" && <div className="miss">{s.statusLabel}</div>}
                  {st !== "exportado" && (
                    <footer>
                      {st === "pendiente" && <button className="sm" onClick={() => openInList(s)}><PencilLine size={14} /> Completar</button>}
                      {st === "listo" && <><button className="sm primary" onClick={() => go("export", emp)}><FileDown size={14} /> Exportar</button><button className="sm" onClick={() => openInList(s)}>Revisar</button></>}
                    </footer>
                  )}
                </div>
              ))}
              {!all.length && <div className="none">{st === "pendiente" ? "Nada por completar" : st === "listo" ? "Ninguna lista todavía" : "Aún no hay solicitudes en SAP"}</div>}
            </div>
            {st === "exportado" && all.length > 6 && <button className="sm more" onClick={() => setShowAll(!showAll)}>{showAll ? "Ver menos" : `Ver las ${all.length}`}</button>}
          </section>
        );
      })}
    </div>
  );
}

export default function BandejaAdmin({ emp, setEmp, go }) {
  const { items, config, persist, removeItems, toast } = useApp();
  const [filter, setFilter] = useState("activos");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [openId, setOpenId] = useState(null);
  const [bulkCol, setBulkCol] = useState("");
  const [bulkVal, setBulkVal] = useState("");
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [vista, setVistaState] = useState(() => lsGet("hormiga.bandeja.vista", "lista"));
  const setVista = (v) => { setVistaState(v); lsSet("hormiga.bandeja.vista", v); };

  const comp = COMPANIES[emp];
  const rows = useMemo(
    () => items.filter((i) => i.empresa === emp).map((i) => { const eff = effective(i, config); return { item: i, eff, info: statusInfo(i, config, eff) }; }),
    [items, emp, config]
  );
  const dup = useMemo(() => duplicates(items, emp, config), [items, emp, config]);
  // Cada solicitud se muestra con sus artículos debajo; los filtros y contadores son por solicitud.
  const sols = useMemo(() => groupSolicitudes(items.filter((i) => i.empresa === emp), config), [items, emp, config]);
  const count = { listo: 0, pendiente: 0, exportado: 0 };
  sols.forEach((s) => count[s.st]++);

  const q = search.trim().toUpperCase();
  const solList = sols.filter((s) =>
    (filter === "todos" || (filter === "activos" ? s.st !== "exportado" : s.st === filter)) &&
    (!q || s.label.toUpperCase().includes(q) || s.rows.some(({ eff }) => (eff.ItemName + " " + eff.ItemCode).toUpperCase().includes(q)))
  );
  const rowById = new Map(rows.map((r) => [r.item.id, r]));
  const list = solList.flatMap((s) => s.items.map((i) => rowById.get(i.id)).filter(Boolean));
  // Columnas visibles en la tabla; el resto está en el panel de detalle.
  const cols = comp.cols.filter((c) => c.code === "ItemCode" || c.who === "user");
  const open = rows.find((r) => r.item.id === openId)?.item;

  const visibleKey = list.map((r) => r.item.id).join(",");
  useEffect(() => {
    const visible = new Set(visibleKey.split(","));
    setSelected((s) => { const n = new Set([...s].filter((id) => visible.has(id))); return n.size === s.size ? s : n; });
  }, [visibleKey]);

  const editable = comp.cols.filter((c) => c.code !== "ItemName");
  const chosenCol = editable.find((c) => c.code === bulkCol) || editable[0];
  const selItems = () => [...selected].map((id) => items.find((i) => i.id === id)).filter(Boolean);
  const allSel = list.length > 0 && list.every((r) => selected.has(r.item.id));
  const display = (c, v) => { const o = c.kind === "dim" && optionsFor(c, emp, config); return (o && o.find((x) => x[0] === v)?.[1]) || v; };

  return (
    <>
      <PageHeader crumb={["Administración", "Bandeja"]} title="Bandeja de solicitudes" lead="Cada solicitud aparece con sus artículos. Escribe el código directo en la tabla. Usa «Detalle» si necesitas ver o cambiar otros campos.">
        <Segmented options={EMP_KEYS.map((k) => [k, COMPANIES[k].short])} value={emp} onChange={(k) => { setEmp(k); setSelected(new Set()); setOpenId(null); setBulkCol(""); }} />
        <button className="primary" disabled={!count.listo} onClick={() => go("export", emp)}><FileDown size={16} /> Exportar {count.listo} lista{count.listo === 1 ? "" : "s"}</button>
      </PageHeader>

      <CompanyBanner emp={emp}>
        <span><b>{count.pendiente}</b>por completar</span>
        <span><b>{count.listo}</b>lista{count.listo === 1 ? "" : "s"}</span>
      </CompanyBanner>

      <div className="kpis">
        {[["pendiente", "Solicitudes pendientes", CircleDashed], ["listo", "Listas para exportar", CircleCheck], ["exportado", "Exportadas", PackageCheck]].map(([k, l, Icon]) => (
          <button key={k} className={"kpi " + (vista === "lista" && filter === k ? "on" : "")} onClick={() => { setVista("lista"); setFilter(filter === k ? "activos" : k); }}>
            <span><Icon size={13} /> {l}</span><b>{count[k]}</b>
          </button>
        ))}
      </div>

      <div className="row">
        <label className="search"><Search size={16} color="var(--rotulo)" /><input type="search" placeholder="Buscar número de solicitud, código o descripción" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar" /></label>
        {vista === "lista" && (
          <select className="control" aria-label="Filtrar por estado" value={filter} onChange={(e) => setFilter(e.target.value)}>
            {FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        )}
        <span className="spacer" />
        {vista === "lista" && (
          <div className="legend">
            <span><i className="i-user" />Usuario</span><span><i className="i-admin" />Administrador</span><span><i className="i-bad" />Falta</span>
          </div>
        )}
        <div className="seg sm" role="group" aria-label="Vista">
          <button className={vista === "lista" ? "on" : ""} onClick={() => setVista("lista")}><List size={14} /> Lista</button>
          <button className={vista === "tablero" ? "on" : ""} onClick={() => { setVista("tablero"); setOpenId(null); setSelected(new Set()); }}><KanbanSquare size={14} /> Tablero</button>
        </div>
      </div>

      {vista === "tablero" ? (
        sols.length ? (
          <Board sols={sols.filter((s) => !q || s.label.toUpperCase().includes(q) || s.rows.some(({ eff }) => (eff.ItemName + " " + eff.ItemCode).toUpperCase().includes(q)))} go={go} emp={emp}
            openInList={(s) => { setVista("lista"); setFilter("todos"); setSearch(s.label); }} />
        ) : (
          <Empty icon={AntIcon} title={`Sin solicitudes de ${comp.name}`}>Cuando un usuario envíe artículos de esta empresa, aparecerán aquí.</Empty>
        )
      ) : <>
      {selected.size > 0 && (
        <div className="bulk">
          <b>{selected.size} seleccionado{selected.size > 1 ? "s" : ""}</b>
          <span>Asignar</span>
          <select aria-label="Campo" value={chosenCol.code} onChange={(e) => setBulkCol(e.target.value)}>
            {editable.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <input placeholder="valor" aria-label="Valor" value={bulkVal} onChange={(e) => setBulkVal(e.target.value)} />
          <button className="primary sm" onClick={() => { selItems().forEach((it) => persist(applyValue(it, chosenCol, bulkVal, config))); toast(`${chosenCol.label} actualizado en ${selected.size} artículo(s).`); }}>Aplicar</button>
          <span className="spacer" />
          <button className="sm" onClick={() => selItems().forEach((it) => persist({ ...it, exportado: false, exportedAt: null, lote: null }))}>Marcar sin exportar</button>
          {confirmBulk ? (
            <>
              <button className="sm danger primary" onClick={() => { const n = selected.size; removeItems([...selected]); setSelected(new Set()); setConfirmBulk(false); toast(`${n} artículo(s) eliminados.`); }}>Confirmar eliminación</button>
              <button className="sm" onClick={() => setConfirmBulk(false)}>Cancelar</button>
            </>
          ) : (
            <button className="sm" onClick={() => setConfirmBulk(true)}>Eliminar</button>
          )}
        </div>
      )}

      {list.length ? (
        <div className={open ? "with-drawer" : ""}>
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th style={{ width: 40 }}><input type="checkbox" checked={allSel} aria-label="Seleccionar todos" onChange={(e) => setSelected(e.target.checked ? new Set(list.map((r) => r.item.id)) : new Set())} /></th>
                  <th>Estado</th>
                  {cols.map((c) => <th key={c.code} className={c.who}><span className="code">{c.code}</span>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {solList.map((sol) => {
                  const ids = sol.items.map((i) => i.id);
                  const allOn = ids.every((id) => selected.has(id));
                  return [
                    <tr key={sol.id} className="solrow">
                      <td className="num">
                        <input type="checkbox" checked={allOn} aria-label={`Seleccionar solicitud ${sol.label}`} onChange={(e) => { const n = new Set(selected); ids.forEach((id) => (e.target.checked ? n.add(id) : n.delete(id))); setSelected(n); }} />
                      </td>
                      <td colSpan={cols.length + 1}>
                        <div className="solhead">
                          <b className="mono">{sol.label}</b>
                          <span className={"pill " + sol.st}>{sol.statusLabel}</span>
                          <span className="muted">{sol.createdByName ? sol.createdByName.split("@")[0] + " · " : ""}{fmtDate(sol.createdAt)} · {sol.items.length} artículo{sol.items.length > 1 ? "s" : ""}</span>
                          <span className="spacer" />
                          {sol.st === "listo" && <button className="sm" onClick={() => go("export", emp)}><FileDown size={14} /> Exportar</button>}
                        </div>
                      </td>
                    </tr>,
                    ...sol.items.map((it) => rowById.get(it.id)).filter(Boolean).map(({ item, eff, info }) => {
                  const bad = new Set(info.issues.map((p) => p.code));
                  if (dup.has(item.id)) bad.add("ItemCode");
                  return (
                    <tr key={item.id} className={(selected.has(item.id) ? "sel " : "") + (openId === item.id ? "open" : "")}>
                      <td className="num">
                        <input type="checkbox" checked={selected.has(item.id)} aria-label="Seleccionar" onChange={(e) => { const n = new Set(selected); e.target.checked ? n.add(item.id) : n.delete(item.id); setSelected(n); }} />
                      </td>
                      <td className="meta">
                        <div className="statecell">
                          <StatusPill info={info} />
                          <button className={"sm detailbtn " + (openId === item.id ? "on" : "")} title="Ver y editar todos los campos" aria-label="Ver y editar todos los campos"
                            onClick={() => setOpenId(openId === item.id ? null : item.id)}>
                            <PanelRightOpen size={14} /> Detalle
                          </button>
                        </div>
                      </td>
                      {cols.map((c) =>
                        // El código se completa directo en la tabla, sin abrir el panel.
                        c.code === "ItemCode" && !item.exportado ? (
                          <td key={c.code} className={"edit mono " + (bad.has(c.code) ? "bad" : "")}>
                            <ItemCell col={c} emp={emp} config={config} value={eff[c.code]} placeholder="Escribe el código"
                              onCommit={(v) => persist(applyValue(item, c, v, config))} />
                          </td>
                        ) : (
                          <td key={c.code} className={"txt " + (c.code === "ItemCode" ? "mono " : "") + (bad.has(c.code) ? "bad" : "")} style={{ color: item.exportado ? "var(--rotulo)" : undefined }}>
                            {display(c, eff[c.code]) || <span className="muted">—</span>}
                          </td>
                        )
                      )}
                    </tr>
                  );
                    }),
                  ];
                })}
              </tbody>
            </table>
          </div>
          {open && <ItemDrawer key={open.id} item={open} dupCodes={dup} onClose={() => setOpenId(null)} />}
        </div>
      ) : (
        <Empty icon={rows.length ? Inbox : AntIcon} title={rows.length ? "Nada con este filtro" : `Sin solicitudes de ${comp.name}`}>
          {rows.length ? "Prueba con otro estado o borra la búsqueda." : "Cuando un usuario envíe artículos de esta empresa, aparecerán aquí."}
        </Empty>
      )}
      </>}
    </>
  );
}
