// app/routes/login.tsx
import { useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup, 
  onAuthStateChanged 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore"; // <--- Importado Firestore
import { useNavigate } from "react-router";
import { auth, googleProvider, db } from "~/lib/firebase.client"; // <--- Importado db

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  // 1. Redirecionamento Inteligente
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // === HELPER: Sincronização Inteligente com Firestore ===
  const syncUserToFirestore = async (user: any) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      const now = new Date().toISOString();

      if (userSnap.exists()) {
        // USUÁRIO EXISTENTE:
        // Atualiza apenas metadados (nome, foto, login) sem tocar no Plano
        await setDoc(userRef, {
          email: user.email,
          name: user.displayName || userSnap.data().name || "", 
          photoUrl: user.photoURL || userSnap.data().photoUrl || "",
          lastLogin: now
        }, { merge: true });
      } else {
        // NOVO USUÁRIO:
        // Cria o documento com os defaults do SaaS (Free/Active)
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          name: user.displayName || "",
          photoUrl: user.photoURL || "",
          plan: "FREE",
          subscriptionStatus: "ACTIVE",
          createdAt: now,
          lastLogin: now
        });
      }
    } catch (e) {
      console.error("Erro ao sincronizar Firestore:", e);
    }
  };

  // 2. Função de Login com Google
  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await syncUserToFirestore(result.user); // <--- Sync automático
      navigate("/");
    } catch (err: any) {
      console.error(err);
      setError("Erro ao autenticar com Google.");
      setLoading(false);
    }
  };

  // 3. Função de Login com Email/Senha
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await signInWithEmailAndPassword(auth, email, password);
      } else {
        result = await createUserWithEmailAndPassword(auth, email, password);
      }
      
      // Sincroniza independente se foi login ou cadastro
      await syncUserToFirestore(result.user); 
      navigate("/"); 
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setError("E-mail ou senha incorretos.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("Este e-mail já está cadastrado.");
      } else if (err.code === 'auth/weak-password') {
        setError("A senha deve ter pelo menos 6 caracteres.");
      } else {
        setError("Ocorreu um erro. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100 p-4">
      <div className="w-full max-w-md bg-gray-900 p-8 rounded-xl border border-gray-800 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-500 mb-2">Financial Hub</h1>
          <p className="text-gray-400">
            {isLogin ? "Entre para gerenciar seus ganhos" : "Crie sua conta gratuitamente"}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded mb-4 text-sm text-center">
            {error}
          </div>
        )}

        {/* === BOTÃO DO GOOGLE === */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          disabled={loading}
          className="w-full bg-white text-gray-900 font-bold py-3 rounded-lg mb-4 flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              style={{ fill: "#4285F4" }}
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              style={{ fill: "#34A853" }}
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
              style={{ fill: "#FBBC05" }}
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              style={{ fill: "#EA4335" }}
            />
          </svg>
          Entrar com Google
        </button>

        <div className="relative flex items-center justify-center mb-4">
          <div className="border-t border-gray-700 w-full absolute"></div>
          <span className="bg-gray-900 px-3 text-gray-500 text-sm relative z-10">OU</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">E-mail</label>
            <input
              type="email"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Senha</label>
            <input
              type="password"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50"
          >
            {loading ? "Carregando..." : (isLogin ? "Acessar Sistema" : "Criar Conta")}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-emerald-400 hover:text-emerald-300 underline"
          >
            {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Faça Login"}
          </button>
        </div>
      </div>
    </div>
  );
}