import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import { firestoreStore, localStore } from "./stores.js";
import { mergeConfig } from "../domain/rules.js";
import { groupSolicitudes, solicitudId } from "../domain/solicitudes.js";
import { DEFAULT_CONFIG, EMP_KEYS } from "../domain/companies.js";
import { clone, lsGet, lsSet, uid } from "../domain/utils.js";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

// En desarrollo, abrir con ?local usa datos de prueba en el navegador en vez de Firebase.
const LOCAL_MODE = import.meta.env.DEV && new URLSearchParams(location.search).has("local");

const byCreated = (a, b) => (a.createdAt || 0) - (b.createdAt || 0);
const byDateDesc = (a, b) => (b.at || 0) - (a.at || 0);

// Calcula la sesión a partir del perfil usuarios/{correo}.
// superAdmin: tiene documento admins/{correo} (se define en la consola y no se puede quitar desde la app).
// Si el perfil no se puede leer (reglas antiguas), se mantiene el comportamiento anterior: todas las empresas.
function sessionFrom(user, superAdmin, prof, profileOk) {
  const bloqueado = !!prof?.bloqueado;
  const isAdmin = superAdmin || (prof?.rol === "admin" && !bloqueado);
  const empresas = isAdmin || !profileOk ? [...EMP_KEYS] : bloqueado ? [] : EMP_KEYS.filter((k) => (prof?.empresas || []).includes(k));
  return { status: "ready", user, isAdmin, superAdmin, bloqueado, empresas, profileOk };
}

// Escucha el perfil propio: lo crea la primera vez (sin empresas) y anota el último ingreso.
function watchOwnProfile(store, user, superAdmin, setSession) {
  let touched = false;
  return store.watchProfile(
    user.email,
    (prof) => {
      if (!touched) {
        touched = true;
        const base = { email: user.email, nombre: user.name, uid: user.uid, lastLogin: Date.now() };
        const first = { ...base, rol: superAdmin ? "admin" : "usuario", empresas: superAdmin ? [...EMP_KEYS] : [], bloqueado: false, createdAt: Date.now() };
        store.setUser(user.email, prof ? base : first).catch(() => {});
      }
      setSession(sessionFrom(user, superAdmin, prof, true));
    },
    () => setSession(sessionFrom(user, superAdmin, null, false))
  );
}

const SIGNED_OUT = { status: "signedOut", user: null, isAdmin: false, empresas: [] };
const CHECKING = { status: "checking", user: null, isAdmin: false, empresas: [] };

export function AppProvider({ children }) {
  // session.status: "checking" | "signedOut" | "ready"
  const [session, setSession] = useState(CHECKING);
  const [localAdmin, setLocalAdminState] = useState(() => lsGet("maestro.local.admin", false));
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [config, setConfig] = useState(() => clone(DEFAULT_CONFIG));
  const [hist, setHist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);
  const storeRef = useRef(null);
  const queues = useRef({});

  const toast = useCallback((msg, err = false) => setToastMsg({ msg, err, id: Date.now() }), []);
  const writeErr = useCallback(
    (e) => {
      const c = e && e.code;
      if (c === "permission-denied") toast("No tienes permiso para guardar este cambio. Si crees que es un error, avisa al administrador.", true);
      else toast("No se pudo guardar: " + ((e && e.message) || c || e), true);
    },
    [toast]
  );

  // Sesión de Firebase, rol y empresas permitidas (perfil usuarios/{correo}, que se actualiza en vivo).
  useEffect(() => {
    if (LOCAL_MODE) return;
    let offProfile = () => {};
    const offAuth = onAuthStateChanged(auth, async (u) => {
      offProfile();
      offProfile = () => {};
      if (!u) {
        setSession(SIGNED_OUT);
        return;
      }
      setSession(CHECKING);
      const email = String(u.email || "").toLowerCase();
      let superAdmin = false;
      try {
        superAdmin = (await getDoc(doc(db, "admins", email))).exists();
      } catch {
        superAdmin = false;
      }
      const user = { uid: u.uid, name: u.displayName || u.email || "", email };
      offProfile = watchOwnProfile(firestoreStore(db, u.uid, false), user, superAdmin, setSession);
    });
    return () => {
      offAuth();
      offProfile();
    };
  }, []);

  // Modo local: el interruptor Usuario/Admin hace de administrador principal.
  useEffect(() => {
    if (!LOCAL_MODE) return;
    const user = { uid: localUserId(), name: "local@prueba.cl", email: "local@prueba.cl" };
    return watchOwnProfile(localStore(), user, localAdmin, setSession);
  }, [localAdmin]);

  // Suscripción a los datos cuando hay sesión.
  const userId = session.user?.uid;
  useEffect(() => {
    setItems([]);
    setHist([]);
    setUsers([]);
    if (session.status !== "ready") return;
    const store = LOCAL_MODE ? localStore() : firestoreStore(db, userId, session.isAdmin);
    storeRef.current = store;
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 10000);
    const offs = [
      store.subscribeItems(
        (list) => {
          clearTimeout(timer);
          setLoading(false);
          setItems(list.sort(byCreated));
        },
        (e) => {
          clearTimeout(timer);
          setLoading(false);
          toast("No se pudo leer la base: " + (e.message || e.code), true);
        }
      ),
      store.subscribeConfig((c) => setConfig(mergeConfig(c))),
      session.isAdmin ? store.subscribeHist((l) => setHist(l.sort(byDateDesc))) : () => {},
      session.isAdmin ? store.subscribeUsers((l) => setUsers(l.sort((a, b) => a.id.localeCompare(b.id)))) : () => {},
    ];
    return () => {
      clearTimeout(timer);
      offs.forEach((off) => off());
    };
  }, [session.status, userId, session.isAdmin, toast]);

  // Guarda un artículo (escrituras en orden por documento; la pantalla se actualiza al instante).
  const persist = useCallback(
    (item) => {
      const { id, ...rest } = clone(item);
      const data = { ...rest, updatedAt: Date.now(), updatedBy: userId };
      setItems((prev) => {
        const i = prev.findIndex((x) => x.id === id);
        const next = [...prev];
        if (i >= 0) next[i] = { ...data, id };
        else next.push({ ...data, id });
        return next;
      });
      const q = queues.current;
      q[id] = (q[id] || Promise.resolve()).then(() => storeRef.current.setItem(id, data)).catch(writeErr);
      return q[id];
    },
    [userId, writeErr]
  );

  // Pide el siguiente número de solicitud de la empresa.
  const nextSolicitud = useCallback((emp) => storeRef.current.nextSolicitud(emp), []);

  // Numera una sola vez las solicitudes enviadas antes de existir el correlativo (solo el admin puede hacerlo).
  const migrating = useRef(false);
  useEffect(() => {
    if (!session.isAdmin || loading || migrating.current) return;
    const old = groupSolicitudes(items.filter((i) => !i.solicitudId), config).reverse();
    if (!old.length) return;
    migrating.current = true;
    (async () => {
      try {
        for (const s of old) {
          const n = await storeRef.current.nextSolicitud(s.emp);
          await Promise.all(s.items.map((i) => persist({ ...i, solicitudId: solicitudId(s.emp, n), solicitudNum: n })));
        }
        toast(`${old.length} solicitud${old.length > 1 ? "es anteriores quedaron numeradas" : " anterior quedó numerada"}.`);
      } catch (e) {
        writeErr(e);
      } finally {
        migrating.current = false;
      }
    })();
  }, [session.isAdmin, loading, items, config, persist, toast, writeErr]);

  const removeItems = useCallback(
    (ids) => {
      const set = new Set(ids);
      setItems((prev) => prev.filter((i) => !set.has(i.id)));
      ids.forEach((id) => storeRef.current.deleteItem(id).catch(writeErr));
    },
    [writeErr]
  );

  const saveConfig = useCallback(
    async (cfg) => {
      try {
        await storeRef.current.setConfig(cfg);
        setConfig(mergeConfig(cfg));
        toast("Catálogos guardados.");
      } catch (e) {
        writeErr(e);
      }
    },
    [toast, writeErr]
  );

  const addHist = useCallback(
    (rec) => {
      const id = uid();
      setHist((prev) => [{ id, ...rec }, ...prev]);
      storeRef.current
        .addHist(id, rec)
        .catch((e) => toast("El archivo se descargó, pero no se pudo guardar en el historial: " + (e.message || e.code || e), true));
    },
    [toast]
  );

  const removeHist = useCallback(
    (id) => {
      setHist((prev) => prev.filter((h) => h.id !== id));
      storeRef.current.deleteHist(id).catch(writeErr);
    },
    [writeErr]
  );

  // Cambia rol, empresas o bloqueo de un usuario (solo administradores).
  const saveUser = useCallback(
    (email, patch, okMsg) => {
      setUsers((prev) => {
        const i = prev.findIndex((u) => u.id === email);
        if (i < 0) return [...prev, { id: email, ...patch }].sort((a, b) => a.id.localeCompare(b.id));
        const next = [...prev];
        next[i] = { ...next[i], ...patch };
        return next;
      });
      return storeRef.current
        .setUser(email, { ...patch, updatedAt: Date.now(), updatedBy: session.user?.email || "" })
        .then(() => okMsg && toast(okMsg))
        .catch(writeErr);
    },
    [session.user, toast, writeErr]
  );

  const deleteUser = useCallback(
    (email) => {
      setUsers((prev) => prev.filter((u) => u.id !== email));
      storeRef.current.deleteUser(email).catch(writeErr);
    },
    [writeErr]
  );

  const setLocalAdmin = useCallback((v) => {
    lsSet("maestro.local.admin", v);
    setLocalAdminState(v);
  }, []);

  const value = useMemo(
    () => ({
      localMode: LOCAL_MODE,
      session,
      isAdmin: session.isAdmin,
      empresas: session.empresas,
      me: userId,
      myEmail: session.user?.email || "",
      users,
      saveUser,
      deleteUser,
      items,
      config,
      hist,
      loading,
      toastMsg,
      toast,
      persist,
      removeItems,
      nextSolicitud,
      saveConfig,
      addHist,
      removeHist,
      setLocalAdmin,
    }),
    [session, userId, items, config, hist, users, loading, toastMsg, toast, persist, removeItems, nextSolicitud, saveConfig, addHist, removeHist, saveUser, deleteUser, setLocalAdmin]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function localUserId() {
  let id = lsGet("maestro.local.me", null);
  if (!id) {
    id = uid();
    lsSet("maestro.local.me", id);
  }
  return id;
}
