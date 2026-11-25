import { useState } from "react";
import { FileDown, ShieldCheck, Sparkles } from "lucide-react";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../data/firebase.js";
import { useApp } from "../data/AppProvider.jsx";
import AntIcon, { APP_NAME } from "./AntIcon.jsx";

const AUTH_ERR = {
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/wrong-password": "Correo o contraseña incorrectos.",
  "auth/user-not-found": "Correo o contraseña incorrectos.",
  "auth/invalid-email": "El correo no es válido.",
  "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
  "auth/user-disabled": "Tu usuario está desactivado.",
  "auth/network-request-failed": "Sin conexión. Revisa tu internet.",
  "auth/operation-not-allowed": "El ingreso con correo no está activado en Firebase.",
};
const authMsg = (e) => AUTH_ERR[e?.code] || "No se pudo ingresar: " + (e?.message || e);

export default function Login() {
  const { toast } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(authMsg(err));
      setBusy(false);
    }
  }

  async function forgot() {
    if (!email.trim()) {
      setError("Escribe tu correo y vuelve a presionar «Olvidé mi contraseña».");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setError("");
      toast("Si el correo está registrado, te llegará un enlace para cambiar la contraseña.");
    } catch (err) {
      setError(authMsg(err));
    }
  }

  return (
    <div className="login-page">
      <section className="login-brand">
        <div>
          <div className="eyebrow">Grupo Hijuelas · Maestro de Artículos SAP Business One</div>
          <AntIcon size={56} strokeWidth={1.5} className="login-ant" />
          <h1>{APP_NAME}</h1>
          <p className="tagline">Cada artículo, en su lugar.</p>
          <p>Solicita artículos nuevos llenando solo tus campos. Las reglas del Excel completan el resto y el administrador los carga en SAP.</p>
        </div>
        <ul>
          <li><Sparkles size={18} /> Reglas automáticas por empresa y grupo</li>
          <li><ShieldCheck size={18} /> Cada usuario ve solo sus solicitudes</li>
          <li><FileDown size={18} /> TXT en ANSI listo para Data Transfer Workbench</li>
        </ul>
      </section>
      <div className="login-form-wrap">
        <form className="loginform" onSubmit={submit}>
          <div>
            <h2>Ingresa a {APP_NAME}</h2>
            <p className="muted" style={{ fontSize: 13, margin: "6px 0 0" }}>Usa el correo y la contraseña que te entregó el administrador.</p>
          </div>
          <div className="field">
            <label htmlFor="lemail">Correo</label>
            <input id="lemail" type="email" autoComplete="username" placeholder="nombre@grupohijuelas.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="lpass">Contraseña</label>
            <input id="lpass" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="note warn">{error}</p>}
          <button className="primary" type="submit" disabled={busy}>{busy ? "Ingresando…" : "Entrar"}</button>
          <button type="button" className="ghost" style={{ justifyContent: "center" }} onClick={forgot}>Olvidé mi contraseña</button>
        </form>
      </div>
    </div>
  );
}
