import { useState } from "react";
import { Info, Save } from "lucide-react";
import { useApp } from "../data/AppProvider.jsx";
import { COMPANIES, DIM_CODES, EMP_KEYS, hasDims } from "../domain/companies.js";
import { clone, listToText, textToList } from "../domain/utils.js";
import { PageHeader } from "../components/Layout.jsx";

// Se vuelve a montar (key) cuando cambian los catálogos guardados, para mostrar siempre lo último.
export default function Catalogos() {
  const { config } = useApp();
  return <CatalogosForm key={JSON.stringify(config)} config={config} />;
}

function CatalogosForm({ config }) {
  const { saveConfig } = useApp();
  const [draft, setDraft] = useState(() => {
    const d = { grupos: {}, dims: {}, almacen: { ...config.almacen } };
    EMP_KEYS.forEach((k) => {
      d.grupos[k] = listToText(config.grupos[k]);
      if (hasDims(k)) {
        d.dims[k] = {};
        DIM_CODES.forEach((code) => (d.dims[k][code] = listToText((config.dims[k] || {})[code])));
      }
    });
    return d;
  });
  const [dirty, setDirty] = useState(false);
  const update = (fn) => { setDraft(fn(draft)); setDirty(true); };

  function save() {
    const cfg = clone(config);
    EMP_KEYS.forEach((k) => {
      cfg.grupos[k] = textToList(draft.grupos[k]);
      if (draft.dims[k]) {
        cfg.dims[k] = cfg.dims[k] || {};
        DIM_CODES.forEach((code) => (cfg.dims[k][code] = textToList(draft.dims[k][code])));
      }
      cfg.almacen[k] = String(draft.almacen[k] || "").trim();
    });
    saveConfig(cfg);
    setDirty(false);
  }

  return (
    <>
      <PageHeader crumb={["Administración", "Catálogos"]} title="Catálogos" lead="Una línea por valor con el formato «código | nombre». Los cambios se aplican a todos los usuarios al guardar.">
        <button className="primary" onClick={save} disabled={!dirty}><Save size={16} /> Guardar catálogos</button>
      </PageHeader>

      <p className="note info" style={{ display: "flex", gap: 8 }}>
        <Info size={16} style={{ marginTop: 1 }} />
        <span>Las reglas automáticas siguen las fórmulas del Excel. Un grupo nuevo que no está en esas fórmulas deja sus campos automáticos vacíos, y el artículo queda en Pendiente admin para que los completes.</span>
      </p>

      {EMP_KEYS.map((k) => (
        <section className="card" key={k}>
          <header>
            <div className={"mono-mark emp-" + k} style={{ width: 38, height: 38, fontSize: 12 }}>{COMPANIES[k].short}</div>
            <div><h3>{COMPANIES[k].name}</h3><p className="sub">{(config.grupos[k] || []).length} grupos{hasDims(k) ? " · usa dimensiones" : ""}</p></div>
          </header>
          <div className="cfg">
            <div className="field">
              <label htmlFor={`g-${k}`}>Grupos de artículos (OITB)</label>
              <textarea id={`g-${k}`} value={draft.grupos[k]} onChange={(e) => update((d) => ({ ...d, grupos: { ...d.grupos, [k]: e.target.value } }))} />
            </div>
            {draft.dims[k] && DIM_CODES.map((code, i) => (
              <div className="field" key={code}>
                <label htmlFor={`d-${k}-${code}`}>Dimensión {i + 1} ({code})</label>
                <textarea id={`d-${k}-${code}`} placeholder="001 | Nombre" value={draft.dims[k][code]}
                  onChange={(e) => update((d) => ({ ...d, dims: { ...d.dims, [k]: { ...d.dims[k], [code]: e.target.value } } }))} />
              </div>
            ))}
            <div className="field">
              <label htmlFor={`w-${k}`}>Almacén por defecto (DefaultWarehouse)</label>
              <input id={`w-${k}`} maxLength={8} placeholder="001" value={draft.almacen[k] || ""} onChange={(e) => update((d) => ({ ...d, almacen: { ...d.almacen, [k]: e.target.value } }))} />
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
