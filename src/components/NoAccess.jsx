import { signOut } from "firebase/auth";
import { Clock, LogOut } from "lucide-react";
import { auth } from "../data/firebase.js";
import { useApp } from "../data/AppProvider.jsx";

// Se muestra a un usuario bloqueado o que todavía no tiene empresas asignadas.
export default function NoAccess() {
  const { session, localMode, setLocalAdmin } = useApp();
  const blocked = session.bloqueado;
  return (
    <div className="noaccess">
      <div className="box">
        <Clock size={26} strokeWidth={1.6} />
        <h2>{blocked ? "Tu acceso está bloqueado" : "Tu acceso está pendiente"}</h2>
        <p>
          {blocked
            ? "Un administrador bloqueó tu usuario. Si crees que es un error, avísale."
            : "Ya tienes cuenta, pero aún no tienes empresas asignadas. Pídele al administrador que te habilite; la página se actualizará sola."}
        </p>
        <p className="muted">{session.user?.email}</p>
        <div className="row">
          {localMode ? (
            <button onClick={() => setLocalAdmin(true)}>Volver como Admin (modo local)</button>
          ) : (
            <button onClick={() => signOut(auth)}><LogOut size={16} /> Salir</button>
          )}
        </div>
      </div>
    </div>
  );
}
