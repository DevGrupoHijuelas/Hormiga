import { useState } from "react";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../data/firebase.js";
import { useApp } from "../data/AppProvider.jsx";
import AntIcon, { APP_NAME } from "./AntIcon.jsx";

// Recorrido de una solicitud dibujado como un hormiguero: túneles y cámaras bajo tierra.
const TUNEL = "M140 18 L140 112 C140 165 385 128 405 178 C425 230 175 232 158 288 C140 348 385 342 410 402";
const CAMARAS = [
  { x: 140, y: 112, t: "Enviada", s: "tú llenas tus campos" },
  { x: 405, y: 178, t: "En revisión", s: "el admin completa" },
  { x: 158, y: 288, t: "Lista", s: "revisada y validada" },
  { x: 410, y: 402, t: "En SAP", s: "cargada con DTW" },
];
const ANT_PATHS = (
  <>
    <circle cx="16" cy="7.5" r="3" />
    <ellipse cx="16" cy="14.5" rx="2.4" ry="2.8" />
    <ellipse cx="16" cy="23.5" rx="4" ry="5.2" />
    <path d="M14.3 5 11.5 2M17.7 5 20.5 2M13.8 13.5 8 10.5M18.2 13.5 24 10.5M13.6 15.5 7 17.5M18.4 15.5 25 17.5M13 20.5 7.5 25.5M19 20.5 24.5 25.5" />
  </>
);

function Hormiguero() {
  const quieto = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const piedras = [[60, 70], [250, 60], [480, 95], [300, 240], [520, 260], [70, 210], [260, 380], [500, 330], [90, 420], [330, 450]];
  return (
    <svg className="lh-nest" viewBox="0 0 560 470" role="img" aria-label="Recorrido de una solicitud: Enviada, En revisión, Lista y En SAP">
      <rect x="0" y="40" width="560" height="430" rx="16" fill="#113220" />
      <rect x="0" y="190" width="560" height="140" fill="#0f2e1d" />
      <rect x="0" y="330" width="560" height="140" rx="16" fill="#0d2a1a" />
      <path d="M0 40 H560" stroke="#2f7a2c" strokeWidth="3" />
      <g stroke="#3f8f3a" strokeWidth="2" strokeLinecap="round">
        {[30, 48, 95, 210, 228, 300, 360, 378, 450, 520, 538].map((x) => (
          <path key={x} d={`M${x} 40 l-3 -12 M${x + 4} 40 l2 -9`} />
        ))}
      </g>
      <g fill="#1a3f2b">{piedras.map(([x, y]) => <circle key={x + "-" + y} cx={x} cy={y} r={x % 3 ? 3 : 5} />)}</g>
      <path d={TUNEL} fill="none" stroke="#1d4a31" strokeWidth="18" strokeLinecap="round" />
      <path d={TUNEL} fill="none" stroke="#2c5e40" strokeWidth="1.2" strokeDasharray="2 6" />
      <ellipse cx="140" cy="40" rx="20" ry="6" fill="#0b2216" />
      {CAMARAS.map((c, i) => (
        <g key={c.t}>
          <ellipse cx={c.x} cy={c.y} rx="78" ry="30" fill="#16402a" stroke="#a6d98f" strokeOpacity=".55" />
          <text className="lbl" x={c.x} y={c.y - 2} textAnchor="middle">{i + 1}. {c.t}</text>
          <text className="sub" x={c.x} y={c.y + 14} textAnchor="middle">{c.s}</text>
        </g>
      ))}
      <g fill="none" stroke="#a6d98f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {quieto ? (
          <g transform="translate(272 150) rotate(100) translate(-11 -11) scale(.7)">{ANT_PATHS}</g>
        ) : (
          <g>
            <animateMotion dur="18s" repeatCount="indefinite" rotate="auto" path={TUNEL} />
            <g transform="rotate(90) translate(-11 -11) scale(.7)">{ANT_PATHS}</g>
          </g>
        )}
      </g>
    </svg>
  );
}

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
      // Si se entró desde la vista previa ?login, se quita para pasar a la app.
      if (new URLSearchParams(location.search).has("login")) location.replace(location.pathname);
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
      <section className="lh-brand">
        <div className="eyebrow">Grupo Hijuelas · Maestro de Artículos SAP Business One</div>
        <div className="lh-title">
          <AntIcon size={48} strokeWidth={1.6} />
          <h1>{APP_NAME}</h1>
        </div>
        <p className="lh-tagline">Cada artículo, en su lugar.</p>
        <Hormiguero />
      </section>
      <div className="lh-form-wrap">
        <div className="lh-card">
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
        <p className="lh-foot"><AntIcon size={16} /> Tu solicitud baja por el hormiguero hasta quedar en SAP.</p>
        </div>
      </div>
    </div>
  );
}
