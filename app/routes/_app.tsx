import { Outlet, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Sidebar } from "~/components/sidebar";
import { MobileNav } from "~/components/mobile-nav";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "~/lib/firebase.client";
import { Loader2 } from "lucide-react";

export default function AppLayout() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  // REMOVIDO: const auth = getAuth(app); -> Causava erro no servidor

  useEffect(() => {
    // CORREÇÃO: Inicializa o auth apenas no lado do cliente (navegador)
    const auth = getAuth(app);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    // Fundo escuro para combinar com o tema do App do Usuário
    <div className="flex min-h-screen bg-gray-900 text-gray-100">
      
      {/* --- SIDEBAR DESKTOP --- 
          Adicionamos este wrapper <aside> para fixar a Sidebar na esquerda,
          assim como fizemos no layout de Admin.
      */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 z-50 border-r border-gray-800 bg-gray-900">
        <Sidebar type="user" />
      </aside>

      {/* --- ÁREA PRINCIPAL --- */}
      <main className="flex-1 flex flex-col min-h-screen md:pl-64 transition-all duration-300">
        
        {/* Mobile Navigation (Barra Inferior) */}
        <MobileNav type="user" />

        {/* --- CONTEÚDO --- 
            mb-20: Espaço para a barra inferior no mobile
            md:mb-0: Remove espaço no desktop
        */}
        <div className="flex-1 p-4 md:p-8 overflow-x-hidden mb-20 md:mb-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}