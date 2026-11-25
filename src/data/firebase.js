import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración pública de la app web (no es un secreto: la seguridad la dan las reglas de Firestore).
const firebaseConfig = {
  apiKey: "AIzaSyAZilgEuT-hfKq-zwdjEsYyast0TVfXg1s",
  authDomain: "hormiga-c42a7.firebaseapp.com",
  projectId: "hormiga-c42a7",
  storageBucket: "hormiga-c42a7.firebasestorage.app",
  messagingSenderId: "425049130127",
  appId: "1:425049130127:web:4f8bf4239aef8d17de1cfa",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
