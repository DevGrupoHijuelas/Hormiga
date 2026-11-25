import { useEffect, useState } from "react";
import { Moon, Rows3, Sun } from "lucide-react";
import { lsGet, lsSet } from "../domain/utils.js";

// Tema claro u oscuro y densidad (normal o compacta). Se guardan en este navegador.
export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || lsGet("hormiga.theme", "light"));
  const [density, setDensity] = useState(() => lsGet("hormiga.density", "normal"));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#090e0b" : "#0e2a1a");
    lsSet("hormiga.theme", theme);
  }, [theme]);
  useEffect(() => {
    if (density === "compact") document.documentElement.dataset.density = "compact";
    else delete document.documentElement.dataset.density;
    lsSet("hormiga.density", density);
  }, [density]);

  return {
    theme, density,
    toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    toggleDensity: () => setDensity((d) => (d === "compact" ? "normal" : "compact")),
  };
}

export function ThemeButton({ t, className = "" }) {
  const dark = t.theme === "dark";
  return (
    <button className={className} onClick={t.toggleTheme} title={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"} aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
      {dark ? <Sun size={14} /> : <Moon size={14} />} {dark ? "Claro" : "Oscuro"}
    </button>
  );
}

export function ThemeBar({ t }) {
  return (
    <div className="themebar">
      <ThemeButton t={t} />
      <button className={t.density === "compact" ? "on" : ""} aria-pressed={t.density === "compact"} onClick={t.toggleDensity} title="Mostrar más filas en las tablas">
        <Rows3 size={14} /> Compacto
      </button>
    </div>
  );
}
