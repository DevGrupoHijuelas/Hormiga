import { collection, deleteDoc, doc, onSnapshot, query, runTransaction, setDoc, where } from "firebase/firestore";
import { clone, lsGet, lsSet } from "../domain/utils.js";

/*
 * Un "store" guarda artículos, catálogos e historial. Todos los subscribe devuelven una función para cancelar.
 *   subscribeItems(ok, fail)  subscribeConfig(ok)  subscribeHist(ok)
 *   setItem(id, data)  deleteItem(id)  setConfig(cfg)  addHist(id, data)  deleteHist(id)
 * Usuarios (perfil y permisos, el id es el correo en minúsculas):
 *   watchProfile(email, ok, fail)  subscribeUsers(ok)  setUser(email, data) (combina)  deleteUser(email)
 * Correlativo de solicitudes por empresa (contadores/{empresa}.ultimo):
 *   nextSolicitud(emp) -> Promise<número>
 */

// Firestore no admite listas dentro de listas: los catálogos [código, nombre] se guardan como {codigo, nombre}.
const listOut = (l) => (l || []).map(([codigo, nombre]) => ({ codigo, nombre: nombre || "" }));
const listIn = (l) => (l || []).map((x) => (Array.isArray(x) ? x : [x.codigo, x.nombre || ""]));
const mapLists = (obj, fn) => Object.fromEntries(Object.entries(obj || {}).map(([k, l]) => [k, fn(l)]));

export function configToFirestore(cfg) {
  return {
    grupos: mapLists(cfg.grupos, listOut),
    dims: Object.fromEntries(Object.entries(cfg.dims || {}).map(([k, d]) => [k, mapLists(d, listOut)])),
    almacen: cfg.almacen || {},
  };
}
export function configFromFirestore(data) {
  if (!data) return null;
  return {
    grupos: mapLists(data.grupos, listIn),
    dims: Object.fromEntries(Object.entries(data.dims || {}).map(([k, d]) => [k, mapLists(d, listIn)])),
    almacen: data.almacen || {},
  };
}

const docs = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

export function firestoreStore(db, uid, isAdmin) {
  const articulos = collection(db, "articulos");
  const catalogos = doc(db, "config", "catalogos");
  const exportaciones = collection(db, "exportaciones");
  const usuarios = collection(db, "usuarios");
  return {
    nextSolicitud: (emp) =>
      runTransaction(db, async (tx) => {
        const ref = doc(db, "contadores", emp);
        const snap = await tx.get(ref);
        const n = (snap.exists() ? Number(snap.data().ultimo) || 0 : 0) + 1;
        tx.set(ref, { ultimo: n });
        return n;
      }),
    watchProfile: (email, ok, fail) => onSnapshot(doc(usuarios, email), (s) => ok(s.exists() ? s.data() : null), fail),
    subscribeUsers: (ok) => onSnapshot(usuarios, (s) => ok(docs(s)), () => {}),
    setUser: (email, data) => setDoc(doc(usuarios, email), data, { merge: true }),
    deleteUser: (email) => deleteDoc(doc(usuarios, email)),
    subscribeItems(ok, fail) {
      // Un usuario normal solo puede leer sus propias solicitudes (lo exigen las reglas de seguridad).
      const q = isAdmin ? articulos : query(articulos, where("createdBy", "==", uid));
      return onSnapshot(q, (s) => ok(docs(s)), fail);
    },
    subscribeConfig: (ok) => onSnapshot(catalogos, (s) => ok(s.exists() ? configFromFirestore(s.data()) : null), () => {}),
    subscribeHist: (ok) => onSnapshot(exportaciones, (s) => ok(docs(s)), () => {}),
    setItem: (id, data) => setDoc(doc(articulos, id), data),
    deleteItem: (id) => deleteDoc(doc(articulos, id)),
    setConfig: (cfg) => setDoc(catalogos, configToFirestore(cfg)),
    addHist: (id, data) => setDoc(doc(exportaciones, id), data),
    deleteHist: (id) => deleteDoc(doc(exportaciones, id)),
  };
}

// Modo de prueba: todo queda en este navegador (se activa con ?local en el servidor de desarrollo).
// Es una sola instancia para que el perfil y la página Usuarios vean los mismos cambios.
let localInstance = null;
export function localStore() {
  if (localInstance) return localInstance;
  const K = { items: "maestro.local.items", cfg: "maestro.local.config", hist: "maestro.local.hist", users: "maestro.local.users" };
  const subs = { items: new Set(), cfg: new Set(), hist: new Set(), users: new Set() };
  const emit = (k) => subs[k].forEach((f) => f(clone(lsGet(K[k], k === "cfg" ? null : []))));
  const on = (k, f) => {
    subs[k].add(f);
    f(clone(lsGet(K[k], k === "cfg" ? null : [])));
    return () => subs[k].delete(f);
  };
  const upsert = (k, id, data) => {
    const l = lsGet(K[k], []).filter((x) => x.id !== id);
    l.push({ id, ...clone(data) });
    lsSet(K[k], l);
    emit(k);
  };
  const remove = (k, id) => {
    lsSet(K[k], lsGet(K[k], []).filter((x) => x.id !== id));
    emit(k);
  };
  localInstance = {
    nextSolicitud: async (emp) => {
      const c = lsGet("maestro.local.contadores", {});
      c[emp] = (c[emp] || 0) + 1;
      lsSet("maestro.local.contadores", c);
      return c[emp];
    },
    watchProfile: (email, ok) => on("users", (l) => ok(l.find((u) => u.id === email) || null)),
    subscribeUsers: (ok) => on("users", ok),
    setUser: async (email, data) => {
      const prev = lsGet(K.users, []).find((u) => u.id === email) || {};
      const { id: _id, ...rest } = prev;
      upsert("users", email, { ...rest, ...data });
    },
    deleteUser: async (email) => remove("users", email),
    subscribeItems: (ok) => on("items", ok),
    subscribeConfig: (ok) => on("cfg", ok),
    subscribeHist: (ok) => on("hist", ok),
    setItem: async (id, data) => upsert("items", id, data),
    deleteItem: async (id) => remove("items", id),
    setConfig: async (cfg) => {
      lsSet(K.cfg, clone(cfg));
      emit("cfg");
    },
    addHist: async (id, data) => upsert("hist", id, data),
    deleteHist: async (id) => remove("hist", id),
  };
  return localInstance;
}
