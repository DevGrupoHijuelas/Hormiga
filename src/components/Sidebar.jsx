import { signOut } from "firebase/auth";
import { FilePlus2, FileDown, History, House, Inbox, ListChecks, LogOut, SlidersHorizontal, TableProperties, UserCog } from "lucide-react";
import { auth } from "../data/firebase.js";
import { useApp } from "../data/AppProvider.jsx";
import AntIcon, { APP_NAME, APP_VERSION } from "./AntIcon.jsx";
import { ThemeBar } from "./Theme.jsx";

export const NAV = [
  { group: "Hormiga", items: [
    { key: "inicio", label: "Inicio", icon: House },
  ] },
  { group: "Solicitudes", items: [
    { key: "nuevo", label: "Nueva solicitud", icon: FilePlus2 },
    { key: "mias", label: "Mis solicitudes", icon: ListChecks },
    { key: "campos", label: "Campos por empresa", icon: TableProperties },
  ] },
  { group: "Administración", admin: true, items: [
    { key: "admin", label: "Bandeja", icon: Inbox },
    { key: "export", label: "Exportar TXT", icon: FileDown },
    { key: "hist", label: "Historial", icon: History },
    { key: "cat", label: "Catálogos", icon: SlidersHorizontal },
    { key: "users", label: "Usuarios", icon: UserCog },
  ] },
];

// Iniciales a partir del nombre o de la parte del correo antes de la @.
function initials(name) {
  const words = (name || "?").split("@")[0].split(/[\s._-]+/).filter(Boolean);
  const s = words.length > 1 ? words[0][0] + words[1][0] : (words[0] || "?").slice(0, 2);
  return s.toUpperCase();
}

export default function Sidebar({ page, setPage, counts, theme }) {
  const { session, isAdmin, localMode, setLocalAdmin } = useApp();
  const name = session.user?.name || "";

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-row">
          <AntIcon size={34} strokeWidth={1.7} />
          <div>
            <div className="eyebrow">Grupo Hijuelas</div>
            <h1>{APP_NAME}</h1>
          </div>
        </div>
        <p>Maestro de Artículos · SAP B1</p>
      </div>
      <nav className="nav" aria-label="Secciones">
        {NAV.filter((g) => !g.admin || isAdmin).map((g) => (
          <div key={g.group} style={{ display: "contents" }}>
            <div className="nav-group">{g.group}</div>
            {g.items.map(({ key, label, icon: Icon }) => (
              <button key={key} className={page === key ? "on" : ""} onClick={() => setPage(key)} aria-current={page === key ? "page" : undefined}>
                <Icon size={18} strokeWidth={1.8} />
                {label}
                {counts[key] > 0 && <span className="count">{counts[key]}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="userbox">
        <div className="avatar">{initials(name)}</div>
        <div className="who">
          <div className="name" title={name}>{name}</div>
          <div className="role">{isAdmin ? "Administrador" : "Usuario"}{localMode ? " · modo local" : ""}</div>
        </div>
        {!localMode && (
          <button className="ghost icon-only" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={() => signOut(auth)}>
            <LogOut size={18} />
          </button>
        )}
      </div>
      <ThemeBar t={theme} />
      <div className="appver">{APP_NAME} v{APP_VERSION}</div>
      {localMode && (
        <div className="rolebar">
          <button className={"sm " + (!isAdmin ? "on" : "")} onClick={() => setLocalAdmin(false)}>Usuario</button>
          <button className={"sm " + (isAdmin ? "on" : "")} onClick={() => setLocalAdmin(true)}>Admin</button>
        </div>
      )}
    </aside>
  );
}
