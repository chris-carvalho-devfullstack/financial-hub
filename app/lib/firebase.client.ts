// app/lib/firebase.client.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence,
  GoogleAuthProvider // <--- 1. Importação necessária
} from "firebase/auth"; 
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Singleton: Garante que só inicializa uma vez
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

// === ADIÇÃO: Provider do Google ===
// Isso cria a configuração necessária para o login funcionar e remove o erro no VS Code
export const googleProvider = new GoogleAuthProvider(); 

// === ADIÇÃO: Forçar persistência local ===
// Isso garante que o login sobreviva ao fechar/abrir o navegador
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Erro ao definir persistência do auth:", error);
});