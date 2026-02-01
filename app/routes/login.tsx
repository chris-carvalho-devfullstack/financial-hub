// app/routes/login.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
// Importamos os tipos para corrigir os erros de 'any'
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"; 
import { supabase } from "~/lib/supabase.client"; 
import { Lock, AlertTriangle } from "lucide-react";

// === Sub-componente: Modal de Conta Bloqueada ===
function BlockedAccountModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-zinc-800 relative">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-500">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Acesso Bloqueado</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
            Sua conta está temporariamente suspensa. Por motivos de segurança ou pendências administrativas, você não pode acessar o sistema no momento.
          </p>
          <div className="w-full bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4 mb-6 border border-gray-100 dark:border-zinc-800 text-left flex items-start gap-3">
             <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
             <div className="text-sm">
               <p className="font-semibold text-gray-700 dark:text-gray-300">Precisa de ajuda?</p>
               <p className="text-gray-500 dark:text-gray-400 mt-1">Entre em contato com o suporte para regularizar sua situação.</p>
             </div>
          </div>
          <button onClick={onClose} className="w-full bg-gray-900 dark:bg-zinc-100 hover:bg-gray-800 text-white dark:text-gray-900 font-bold py-3 rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-xl active:scale-[0.98]">
            Entendido, voltar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  
  const navigate = useNavigate();

  // === 1. Monitoramento de Sessão ===
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) checkUserStatus(session.user.id);
    });

    // CORREÇÃO AQUI: Tipagem explícita para o evento e a sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (session) {
          await checkUserStatus(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUserStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', userId)
        .single();

      // Ignora erro se não encontrar perfil (PGRST116), pois o trigger pode ainda estar criando
      if (error && error.code !== 'PGRST116') {
        console.error("Erro ao buscar perfil:", error);
      }

      if (data && data.subscription_status === 'BLOCKED') {
        await supabase.auth.signOut();
        setShowBlockedModal(true);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Erro inesperado na verificação:", err);
    }
  };

  // === 2. Função de Login com Google ===
  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`, 
        },
      });
      if (error) throw error;
    } catch (err: any) { // 'any' aqui é aceitável para catch block
      console.error(err);
      setError("Erro ao iniciar login com Google.");
      setLoading(false);
    }
  };

  // === 3. Função de Login/Cadastro com Email/Senha ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { full_name: email.split('@')[0] }
          }
        });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Invalid login credentials")) {
        setError("E-mail ou senha incorretos.");
      } else if (err.message?.includes("User already registered")) {
        setError("Este e-mail já está cadastrado.");
      } else if (err.message?.includes("Password should be at least")) {
        setError("A senha deve ter pelo menos 6 caracteres.");
      } else {
        setError(err.message || "Ocorreu um erro. Tente novamente.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100 p-4">
      <BlockedAccountModal isOpen={showBlockedModal} onClose={() => setShowBlockedModal(false)} />

      <div className="w-full max-w-md bg-gray-900 p-8 rounded-xl border border-gray-800 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-500 mb-2">Financial Hub</h1>
          <p className="text-gray-400">
            {isLogin ? "Entre para gerenciar seus ganhos" : "Crie sua conta gratuitamente"}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded mb-4 text-sm text-center flex items-center justify-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          type="button"
          disabled={loading}
          className="w-full bg-white text-gray-900 font-bold py-3 rounded-lg mb-4 flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" style={{ fill: "#4285F4" }} />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" style={{ fill: "#34A853" }} />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" style={{ fill: "#FBBC05" }} />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" style={{ fill: "#EA4335" }} />
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
            <input type="email" required className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Senha</label>
            <input type="password" required className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 cursor-pointer shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98]">
            {loading ? "Carregando..." : (isLogin ? "Acessar Sistema" : "Criar Conta")}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-emerald-400 hover:text-emerald-300 underline cursor-pointer transition-colors">
            {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Faça Login"}
          </button>
        </div>
      </div>
    </div>
  );
}