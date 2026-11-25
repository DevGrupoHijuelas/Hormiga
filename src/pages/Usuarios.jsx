import { useState } from "react";
import { Ban, Lock, Search, Trash2, UserPlus, X } from "lucide-react";
import { useApp } from "../data/AppProvider.jsx";
import { COMPANIES, EMP_KEYS } from "../domain/companies.js";
import { fmtDate } from "../domain/utils.js";
import { Empty, PageHeader } from "../components/Layout.jsx";
import AntIcon from "../components/AntIcon.jsx";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function userState(u) {
  if (u.bloqueado) return ["bloqueado", "Bloqueado"];
  if (u.rol !== "admin" && !(u.empresas || []).length) return ["pendiente", "Sin empresas"];
  return ["activo", "Activo"];
}

function CompanyChips({ value, onToggle, disabled, allOn }) {
  return (
    <div className="empchips">
      {EMP_KEYS.map((k) => {
        const on = allOn || (value || []).includes(k);
        return (
          <button key={k} type="button" className={"empchip " + (on ? "on" : "")} disabled={disabled} aria-pressed={on} title={COMPANIES[k].name} onClick={() => onToggle(k)}>
            {COMPANIES[k].short}
          </button>
        );
      })}
    </div>
  );
}

function RoleSwitch({ value, onChange, disabled, title }) {
  return (
    <div className="seg sm" title={title}>
      {[["usuario", "Usuario"], ["admin", "Admin"]].map(([v, l]) => (
        <button key={v} type="button" className={value === v ? "on" : ""} disabled={disabled} onClick={() => value !== v && onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

function AddUser({ onClose }) {
  const { users, saveUser } = useApp();
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState("usuario");
  const [empresas, setEmpresas] = useState([]);
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    const mail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) return setError("Escribe un correo válido.");
    if (users.some((u) => u.id === mail)) return setError("Ese correo ya está en la lista. Cambia sus permisos en la tabla.");
    if (rol === "usuario" && !empresas.length) return setError("Elige al menos una empresa.");
    saveUser(mail, { email: mail, nombre: mail, rol, empresas: rol === "admin" ? [...EMP_KEYS] : empresas, bloqueado: false, createdAt: Date.now() }, `${mail} agregado.`);
    onClose();
  }

  return (
    <form className="card adduser" onSubmit={submit}>
      <header>
        <div>
          <h3>Agregar usuario</h3>
          <p className="sub">Primero crea la cuenta en Firebase Authentication con este mismo correo. Aquí solo defines lo que puede ver.</p>
        </div>
        <span className="spacer" />
        <button type="button" className="ghost icon-only" aria-label="Cerrar" onClick={onClose}><X size={16} /></button>
      </header>
      <div className="adduser-row">
        <label className="field">
          <span>Correo</span>
          <input type="email" autoFocus value={email} placeholder="nombre@grupohijuelas.com" onChange={(e) => { setEmail(e.target.value); setError(""); }} />
        </label>
        <div className="field">
          <span>Rol</span>
          <RoleSwitch value={rol} onChange={(v) => { setRol(v); setError(""); }} />
        </div>
        <div className="field">
          <span>Empresas</span>
          <CompanyChips value={empresas} allOn={rol === "admin"} disabled={rol === "admin"}
            onToggle={(k) => { setError(""); setEmpresas((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k])); }} />
        </div>
        <button className="primary" type="submit"><UserPlus size={16} /> Agregar</button>
      </div>
      {rol === "admin" && <p className="muted" style={{ margin: 0 }}>Un administrador ve siempre las tres empresas.</p>}
      {error && <p className="note warn">{error}</p>}
    </form>
  );
}

export default function Usuarios() {
  const { users, saveUser, deleteUser, myEmail, session } = useApp();
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  const admins = users.filter((u) => u.rol === "admin" && !u.bloqueado).length;
  const pending = users.filter((u) => userState(u)[0] === "pendiente").length;
  const list = users.filter((u) => !q || u.id.includes(q.trim().toLowerCase()));

  function toggleEmp(u, k) {
    const cur = u.empresas || [];
    const next = cur.includes(k) ? cur.filter((x) => x !== k) : EMP_KEYS.filter((x) => x === k || cur.includes(x));
    saveUser(u.id, { empresas: next });
  }
  function setRol(u, rol) {
    if (rol === "usuario" && admins <= 1 && u.rol === "admin") return;
    saveUser(u.id, { rol, ...(rol === "admin" ? { empresas: [...EMP_KEYS] } : {}) }, rol === "admin" ? `${u.id} ahora es administrador.` : `${u.id} ahora es usuario.`);
  }

  return (
    <>
      <PageHeader crumb={["Administración", "Usuarios"]} title="Usuarios y permisos" lead="Define quién administra y qué empresas puede ver cada persona. Los cambios se aplican al instante.">
        {!adding && <button className="primary" onClick={() => setAdding(true)}><UserPlus size={16} /> Agregar usuario</button>}
      </PageHeader>

      {session.profileOk === false && (
        <p className="note warn">Las reglas de Firestore todavía no permiten leer los permisos. Publica las reglas nuevas para que esta página funcione.</p>
      )}

      <div className="kpis">
        <div className="kpi"><span>Usuarios</span><b>{users.length}</b></div>
        <div className="kpi"><span>Administradores</span><b>{admins}</b></div>
        <div className="kpi"><span>Sin empresas</span><b>{pending}</b></div>
      </div>

      {adding && <AddUser onClose={() => setAdding(false)} />}

      {!users.length ? (
        <Empty icon={AntIcon} title="Agrega a tu equipo" action={<button className="primary" onClick={() => setAdding(true)}><UserPlus size={16} /> Agregar usuario</button>}>
          Las personas aparecen aquí cuando ingresan por primera vez, o puedes agregarlas antes con su correo.
        </Empty>
      ) : (
        <section className="card flush">
          <header>
            <label className="search">
              <Search size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por correo" />
            </label>
          </header>
          <div className="table-wrap">
            <table className="grid users">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Rol</th>
                  <th>Empresas que ve</th>
                  <th>Estado</th>
                  <th>Último ingreso</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => {
                  const self = u.id === myEmail;
                  const isAdm = u.rol === "admin";
                  const lastAdmin = isAdm && admins <= 1;
                  const [st, stLabel] = userState(u);
                  return (
                    <tr key={u.id} className={u.bloqueado ? "dim" : ""}>
                      <td className="txt">
                        <div className="person">
                          <div className="avatar sm">{u.id.slice(0, 2).toUpperCase()}</div>
                          <div style={{ minWidth: 0 }}>
                            <b>{u.id.split("@")[0]}</b>{self && <span className="you">Tú</span>}
                            <small>{u.id}</small>
                          </div>
                        </div>
                      </td>
                      <td className="meta">
                        <RoleSwitch value={isAdm ? "admin" : "usuario"} disabled={self || lastAdmin}
                          title={self ? "No puedes cambiar tu propio rol" : lastAdmin ? "Debe quedar al menos un administrador" : ""}
                          onChange={(v) => setRol(u, v)} />
                      </td>
                      <td className="meta">
                        {isAdm ? <span className="muted">Todas</span> : <CompanyChips value={u.empresas} disabled={u.bloqueado} onToggle={(k) => toggleEmp(u, k)} />}
                      </td>
                      <td className="meta"><span className={"ustate " + st}>{stLabel}</span></td>
                      <td className="meta">{u.lastLogin ? fmtDate(u.lastLogin) : <span className="muted">Aún no ingresa</span>}</td>
                      <td className="meta actions-cell">
                        {self ? (
                          <span className="muted" title="Es tu cuenta"><Lock size={14} /></span>
                        ) : confirmDel === u.id ? (
                          <>
                            <button className="sm danger primary" onClick={() => { setConfirmDel(null); deleteUser(u.id); }}>Quitar</button>{" "}
                            <button className="sm" onClick={() => setConfirmDel(null)}>No</button>
                          </>
                        ) : (
                          <>
                            <button className="sm" disabled={lastAdmin} onClick={() => saveUser(u.id, { bloqueado: !u.bloqueado }, u.bloqueado ? `${u.id} desbloqueado.` : `${u.id} bloqueado.`)}>
                              <Ban size={14} /> {u.bloqueado ? "Desbloquear" : "Bloquear"}
                            </button>
                            <button className="ghost icon-only" disabled={lastAdmin} title="Quitar de la lista" aria-label="Quitar de la lista" onClick={() => setConfirmDel(u.id)}><Trash2 size={15} /></button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!list.length && (
                  <tr><td colSpan={6} className="muted" style={{ padding: 20, textAlign: "center" }}>Ningún correo coincide con «{q}».</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="muted" style={{ fontSize: 12 }}>
            Quitar a alguien de la lista no borra su cuenta de Firebase: si vuelve a entrar, aparecerá sin empresas. Para impedir que entre, usa Bloquear.
          </footer>
        </section>
      )}
    </>
  );
}
