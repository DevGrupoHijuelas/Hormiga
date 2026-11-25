import { useEffect, useRef, useState } from "react";
import { normalize, optionsFor } from "../domain/rules.js";

// Encabezado de columna con código SAP y descripción.
export function ColumnHeader({ col }) {
  return (
    <th className={col.who} title={col.label}>
      <span className="code">{col.code}</span>
      {col.label}
      {col.req ? " *" : ""}
    </th>
  );
}

function withUnknown(opts, value) {
  if (value && !opts.some((o) => o[0] === value)) return [...opts, [value, value + " (no está en catálogo)"]];
  return opts;
}

// Control controlado (borradores de Nueva solicitud): lista o texto según la columna.
export function FieldControl({ col, emp, config, value, onChange, onBlur, onPaste }) {
  const opts = optionsFor(col, emp, config);
  if (opts)
    return (
      <select aria-label={col.label} value={value} onChange={(e) => onChange(e.target.value)}>
        {withUnknown(opts, value).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    );
  return (
    <input
      aria-label={col.label}
      autoComplete="off"
      maxLength={col.max ? col.max + 50 : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onPaste={onPaste}
    />
  );
}

// Celda de un artículo guardado: las listas guardan al cambiar, el texto al salir de la celda o con Enter.
export function ItemCell({ col, emp, config, value, onCommit, placeholder }) {
  const [text, setText] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);

  const opts = optionsFor(col, emp, config);
  if (opts)
    return (
      <select aria-label={col.label} value={value} onChange={(e) => onCommit(e.target.value)}>
        {withUnknown(opts, value).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    );
  return (
    <input
      aria-label={col.label}
      autoComplete="off"
      placeholder={placeholder}
      maxLength={col.max ? col.max + 50 : undefined}
      value={text}
      onFocus={() => (focused.current = true)}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      onBlur={() => {
        focused.current = false;
        const v = normalize(col, text);
        setText(v);
        if (v !== value) onCommit(v);
      }}
    />
  );
}
