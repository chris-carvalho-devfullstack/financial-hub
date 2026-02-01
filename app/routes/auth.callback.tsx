// app/routes/auth.callback.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "~/lib/supabase.client";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Verifica se há erros na URL (vindo do Supabase)
    const params = new URLSearchParams(window.location.search);
    const errorDescription = params.get("error_description");

    if (errorDescription) {
      console.error("Erro no Callback:", errorDescription);
      // Volta para o login mostrando o erro
      navigate(`/login?error=${encodeURIComponent(errorDescription)}`);
      return;
    }

    // Se não houver erro, verifica a sessão e redireciona
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      } else {
        // Se chegou aqui sem sessão e sem erro explícito, volta pro login
        navigate("/login");
      }
    });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-medium">Finalizando autenticação...</p>
      </div>
    </div>
  );
}