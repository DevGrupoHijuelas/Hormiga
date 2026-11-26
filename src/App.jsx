import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { auth } from "./data/firebase.js";
import { useApp } from "./data/AppProvider.jsx";
import { EMP_KEYS } from "./domain/companies.js";
import { rowEmpty } from "./domain/rules.js";
import { groupSolicitudes } from "./domain/solicitudes.js";
import { lsGet, lsSet } from "./domain/utils.js";
import Sidebar, { NAV } from "./components/Sidebar.jsx";
import Login from "./components/Login.jsx";
import Toast from "./components/Toast.jsx";
import AntIcon, { APP_NAME } from "./components/AntIcon.jsx";
import { Skeleton } from "./components/Layout.jsx";
import { ThemeButton, useTheme } from "./components/Theme.jsx";
import Inicio from "./pages/Inicio.jsx";
import NuevaSolicitud from "./pages/NuevaSolicitud.jsx";
import MisSolicitudes from "./pages/MisSolicitudes.jsx";
import BandejaAdmin from "./pages/BandejaAdmin.jsx";
import Exportar from "./pages/Exportar.jsx";
import Historial from "./pages/Historial.jsx";
import Catalogos from "./pages/Catalogos.jsx";
import Campos from "./pages/Campos.jsx";
import Usuarios, { userState } from "./pages/Usuarios.jsx";
import NoAccess from "./components/NoAccess.jsx";

function loadDrafts() {
  const d = lsGet("maestro.drafts", {});
  EMP_KEYS.forEach((k) => {
    if (!Array.isArray(d[k])) d[k] = [];
  });
  return d;
}

export default function App() {
  const { session, localMode, isAdmin, empresas, users, items, config, loading } = useApp();
  const [page, setPage] = useState("inicio");
  const theme = useTheme();
  const [drafts, setDrafts] = useState(loadDrafts);
  const [adminEmp, setAdminEmp] = useState("HG"); // empresa compartida entre Bandeja, Exportar e Historial

  useEffect(() => {
    lsSet("maestro.drafts", drafts);
  }, [drafts]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  // En desarrollo, http://localhost:8766/?login muestra el login sin cerrar la sesión.
  const verLogin = import.meta.env.DEV && new URLSearchParams(location.search).has("login");
  if (session.status === "signedOut" || verLogin)
    return (
      <>
        <Login />
        <Toast />
      </>
    );

  if (session.status === "ready" && !isAdmin && !empresas.length)
    return (
      <>
        <NoAccess />
        <Toast />
      </>
    );

  const allowed = NAV.filter((g) => !g.admin || isAdmin).flatMap((g) => g.items.map((i) => i.key));
  const current = allowed.includes(page) ? page : "inicio";
  const go = (p, emp) => {
    if (emp) setAdminEmp(emp);
    setPage(p);
  };

  const sols = isAdmin ? groupSolicitudes(items, config) : [];
  const counts = {
    nuevo: EMP_KEYS.filter((k) => empresas.includes(k)).reduce((n, k) => n + drafts[k].filter((r) => !rowEmpty(k, r)).length, 0),
    admin: isAdmin ? sols.filter((s) => s.st === "pendiente").length : 0,
    export: isAdmin ? sols.filter((s) => s.st === "listo" && s.num).length : 0,
    users: isAdmin ? users.filter((u) => userState(u)[0] === "pendiente").length : 0,
  };

  let body;
  if (session.status === "checking" || loading) body = <Skeleton />;
  else
    body = {
      inicio: <Inicio go={go} />,
      nuevo: <NuevaSolicitud drafts={drafts} setDrafts={setDrafts} go={go} />,
      mias: <MisSolicitudes go={go} />,
      campos: <Campos />,
      admin: <BandejaAdmin emp={adminEmp} setEmp={setAdminEmp} go={go} />,
      export: <Exportar emp={adminEmp} setEmp={setAdminEmp} go={go} />,
      hist: <Historial emp={adminEmp} setEmp={setAdminEmp} />,
      cat: <Catalogos />,
      users: <Usuarios />,
    }[current];

  return (
    <div className="shell">
      <Sidebar page={current} setPage={setPage} counts={counts} theme={theme} />
      <div style={{ minWidth: 0 }}>
        <div className="mobile-top">
          <AntIcon size={22} />
          <b>{APP_NAME}</b>
          <ThemeButton t={theme} className="sm themebtn" />
          {!localMode && (
            <button className="sm" onClick={() => signOut(auth)}>
              <LogOut size={14} /> Salir
            </button>
          )}
        </div>
        <main className={"content" + (["admin", "export", "hist"].includes(current) ? " emp-" + adminEmp : "")}>
          {localMode && <p className="note info">Modo local de prueba: los datos se guardan solo en este navegador, no en Firebase.</p>}
          {body}
        </main>
      </div>
      <Toast />
    </div>
  );
}
