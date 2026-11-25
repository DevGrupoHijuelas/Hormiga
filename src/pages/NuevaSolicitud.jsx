import { useState } from "react";
import { ArrowLeft, ArrowRight, CircleCheck, Copy, ListChecks, Plus, Send, Trash2 } from "lucide-react";
import { useApp } from "../data/AppProvider.jsx";
import { COMPANIES } from "../domain/companies.js";
import { blankRow, dimCode, draftProblems, effective, normalize, optionsFor, rowEmpty, userCols } from "../domain/rules.js";
import { lsGet, lsSet, uid } from "../domain/utils.js";
import { solicitudId, solicitudLabel } from "../domain/solicitudes.js";
import { ColumnHeader, FieldControl } from "../components/Cells.jsx";
import { Empty, PageHeader } from "../components/Layout.jsx";

const STEPS = [
  ["Empresa", "Para quién es el artículo"],
  ["Artículos", "Completa los campos amarillos"],
  ["Revisar y enviar", "Confirma antes de enviar"],
];
// Campos automáticos que se muestran en la revisión.
const PREVIEW_AUTO = ["PurchaseItem", "SalesItem", "InventoryUOM", "U_BPP_TIPEXIST"];

export default function NuevaSolicitud({ drafts, setDrafts, go }) {
  const { config, persist, toast, me, session, empresas, nextSolicitud } = useApp();
  const [sending, setSending] = useState(false);
  // Solo las empresas permitidas; si hay una sola, queda elegida.
  const [empSaved, setEmpState] = useState(() => lsGet("maestro.emp", null));
  const emp = empresas.length === 1 ? empresas[0] : empresas.includes(empSaved) ? empSaved : null;
  const single = empresas.length === 1;
  const [step, setStep] = useState(emp ? 2 : 1);
  const [showErr, setShowErr] = useState(false);
  const [sent, setSent] = useState(0);

  const setEmp = (k) => {
    setEmpState(k);
    lsSet("maestro.emp", k);
  };
  const rows = emp ? (drafts[emp].length ? drafts[emp] : [blankRow(emp)]) : [];
  const cols = emp ? userCols(emp) : [];
  const setRows = (next) => setDrafts({ ...drafts, [emp]: next });
  const setCell = (i, code, v) => setRows(rows.map((r, j) => (j === i ? { ...r, [code]: v } : r)));
  const filled = rows.filter((r) => !rowEmpty(emp, r));
  const withErr = filled.filter((r) => draftProblems(emp, r, config).length);
  const ok = filled.filter((r) => !draftProblems(emp, r, config).length);

  function onPaste(e, rowIndex, code) {
    const txt = e.clipboardData.getData("text");
    if (!/[\t\n]/.test(txt.trim())) return;
    e.preventDefault();
    const c0 = cols.findIndex((c) => c.code === code);
    // Al copiar desde Jira quedan líneas vacías entre una y otra: se ignoran.
    const all = txt.replace(/\r/g, "").replace(/[​﻿]/g, "").split("\n");
    const lines = all.filter((ln) => ln.replace(/\t/g, "").trim() !== "");
    const skipped = all.length - lines.length - (all[all.length - 1] === "" ? 1 : 0);
    if (!lines.length) return;
    const next = rows.map((r) => ({ ...r }));
    lines.forEach((ln, j) => {
      const ri = rowIndex + j;
      while (next.length <= ri) next.push(blankRow(emp));
      ln.split("\t").forEach((v, k) => {
        const col = cols[c0 + k];
        if (col) next[ri][col.code] = dimCode(col, emp, normalize(col, v), config);
      });
    });
    setRows(next);
    if (lines.length > 1 || skipped > 0)
      toast(`${lines.length} fila${lines.length > 1 ? "s" : ""} pegada${lines.length > 1 ? "s" : ""}.` + (skipped > 0 ? ` Se omitieron ${skipped} línea${skipped > 1 ? "s" : ""} vacía${skipped > 1 ? "s" : ""}.` : ""));
  }

  function toReview() {
    if (!filled.length) {
      toast("Agrega al menos un artículo.", true);
      return;
    }
    if (withErr.length) {
      setShowErr(true);
      toast("Revisa los campos marcados en rojo.", true);
      return;
    }
    setShowErr(false);
    setStep(3);
  }

  // Todos los artículos de un envío forman una sola solicitud con su número correlativo por empresa.
  async function send() {
    if (sending) return;
    setSending(true);
    let n;
    try {
      n = await nextSolicitud(emp);
    } catch (e) {
      setSending(false);
      toast("No se pudo obtener el número de solicitud: " + (e.code === "permission-denied" ? "sin permiso." : e.message || e.code), true);
      return;
    }
    const now = Date.now();
    ok.forEach((r, i) => {
      const valores = {};
      cols.forEach((c) => (valores[c.code] = normalize(c, r[c.code])));
      persist({
        id: uid(), empresa: emp, solicitudId: solicitudId(emp, n), solicitudNum: n, valores, overrides: {},
        createdBy: me, createdByName: session.user?.name || "", createdAt: now + i, exportado: false,
      });
    });
    setRows([blankRow(emp)]);
    setSending(false);
    setSent({ label: solicitudLabel(emp, n), count: ok.length });
    toast(`Solicitud ${solicitudLabel(emp, n)} enviada.`);
  }

  const label = (col, v) => {
    const o = optionsFor(col, emp, config);
    return (o && o.find((x) => x[0] === v)?.[1]) || v;
  };

  if (sent)
    return (
      <>
        <PageHeader crumb={["Solicitudes"]} title="Nueva solicitud" />
        <Empty
          icon={CircleCheck}
          title={`Solicitud ${sent.label} enviada`}
          action={
            <div className="row" style={{ justifyContent: "center" }}>
              <button onClick={() => go("mias")}><ListChecks size={16} /> Ver mis solicitudes</button>
              <button className="primary" onClick={() => { setSent(0); setStep(2); }}><Plus size={16} /> Crear otra</button>
            </div>
          }
        >
          Incluye {sent.count} artículo{sent.count > 1 ? "s" : ""}. El administrador la revisará y completará lo que falte antes de cargarla en SAP. Puedes seguir su estado en Mis solicitudes con este número.
        </Empty>
      </>
    );

  return (
    <>
      <PageHeader crumb={["Solicitudes"]} title="Nueva solicitud" lead="Llena solo los campos amarillos. Las reglas del Excel completan el resto." />

      <div className="steps">
        {STEPS.map(([t, s], i) => {
          const n = i + 1;
          const disabled = (n === 1 && single) || (n > 1 && !emp) || (n === 3 && (withErr.length > 0 || !filled.length));
          return (
            <button key={t} className={"step " + (step === n ? "on" : step > n ? "done" : "")} disabled={disabled} onClick={() => (n === 3 ? toReview() : setStep(n))}>
              <span className="n">{step > n ? "✓" : n}</span>
              <span>{t}<small>{n === 1 && emp ? COMPANIES[emp].name : s}</small></span>
            </button>
          );
        })}
      </div>

      {step === 1 && (
        <section className="card">
          <header><div><h3>¿Para qué empresa es el artículo?</h3><p className="sub">Cada empresa tiene sus propios grupos de artículos y reglas.</p></div></header>
          <div className="empresas">
            {empresas.map((k) => (
              <button key={k} className={"emp emp-" + k + (emp === k ? " on" : "")} onClick={() => { setEmp(k); setShowErr(false); setStep(2); }}>
                <div className="top">
                  <div className={"mono-mark emp-" + k}>{COMPANIES[k].short}</div>
                  <div><b>{COMPANIES[k].name}</b><small>{userCols(k).length} campos para llenar</small></div>
                </div>
                <div className="tags">
                  {(config.grupos[k] || []).map(([c, n]) => <span className="tag" key={c} title={n}>{c} · {n}</span>)}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && emp && (
        <section className="card">
          <header>
            <div className={"mono-mark emp-" + emp} style={{ width: 38, height: 38, fontSize: 12 }}>{COMPANIES[emp].short}</div>
            <div>
              <h3>Artículos para {COMPANIES[emp].name}</h3>
              <p className="sub">
                Puedes pegar varias filas copiadas desde Excel en cualquier celda.
                {emp !== "ISL" && " El código de artículo lo asigna el administrador."}
              </p>
            </div>
            <span className="spacer" />
            {!single && <button className="ghost sm" onClick={() => setStep(1)}>Cambiar empresa</button>}
          </header>
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th>#</th>
                  {cols.map((c) => <ColumnHeader key={c.code} col={c} />)}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const bad = new Set(rowEmpty(emp, r) ? [] : draftProblems(emp, r, config).map((p) => p.code));
                  return (
                    <tr key={i}>
                      <td className="num">{i + 1}</td>
                      {cols.map((c) => (
                        <td key={c.code} className={`u c-${c.code}${showErr && bad.has(c.code) ? " bad" : ""}`}>
                          <FieldControl col={c} emp={emp} config={config} value={r[c.code] || ""}
                            onChange={(v) => setCell(i, c.code, v)}
                            onBlur={(e) => setCell(i, c.code, normalize(c, e.target.value))}
                            onPaste={(e) => onPaste(e, i, c.code)} />
                        </td>
                      ))}
                      <td className="meta">
                        <button className="ghost icon-only" title="Duplicar fila" aria-label="Duplicar fila" onClick={() => setRows([...rows.slice(0, i + 1), { ...r }, ...rows.slice(i + 1)])}><Copy size={15} /></button>
                        <button className="ghost icon-only" title="Quitar fila" aria-label="Quitar fila" onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {showErr && withErr.length > 0 && (
            <ul className="errs">
              {rows.map((r, i) => (rowEmpty(emp, r) ? [] : draftProblems(emp, r, config).map((p) => <li key={i + p.code}>Fila {i + 1}: {p.msg}</li>)))}
            </ul>
          )}
          <div className="row">
            <button onClick={() => setRows([...rows, blankRow(emp)])}><Plus size={16} /> Agregar fila</button>
            <button className="ghost" onClick={() => { setRows([blankRow(emp)]); setShowErr(false); }}>Vaciar</button>
            <span className="spacer" />
            <span className="muted">{filled.length} con datos{withErr.length ? ` · ${withErr.length} con errores` : ""}</span>
            <button className="primary" onClick={toReview}>Revisar <ArrowRight size={16} /></button>
          </div>
        </section>
      )}

      {step === 3 && emp && (
        <section className="card">
          <header>
            <div><h3>Revisa {ok.length} artículo{ok.length > 1 ? "s" : ""} para {COMPANIES[emp].name}</h3><p className="sub">En gris, lo que las reglas completan solas. El administrador revisará el resto.</p></div>
          </header>
          <div className="review">
            {ok.map((r, i) => {
              const e = effective({ empresa: emp, valores: r, overrides: {} }, config);
              const autos = COMPANIES[emp].cols.filter((c) => c.who === "auto" && (PREVIEW_AUTO.includes(c.code) || c.kind === "dim") && e[c.code]);
              return (
                <div className="review-item" key={i}>
                  <div className="idx">{i + 1}</div>
                  <div>
                    <b>{normalize(cols.find((c) => c.code === "ItemName"), r.ItemName)}</b>
                    <div className="chips">
                      {cols.filter((c) => c.code !== "ItemName" && r[c.code]).map((c) => (
                        <span className="chip user" key={c.code}><span className="k">{c.label}</span>{label(c, r[c.code])}</span>
                      ))}
                      {autos.map((c) => (
                        <span className="chip" key={c.code}><span className="k">{c.label}</span>{e[c.code]}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="row">
            <button onClick={() => setStep(2)}><ArrowLeft size={16} /> Volver a editar</button>
            <span className="spacer" />
            <button className="primary" disabled={sending} onClick={send}><Send size={16} /> {sending ? "Enviando…" : `Enviar solicitud (${ok.length} artículo${ok.length > 1 ? "s" : ""})`}</button>
          </div>
        </section>
      )}
    </>
  );
}
