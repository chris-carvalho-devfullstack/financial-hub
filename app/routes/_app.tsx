import { Outlet, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Sidebar } from "~/components/sidebar";
import { MobileNav } from "~/components/mobile-nav";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "~/lib/firebase.client";
// import { Loader2 } from "lucide-react"; // Não é mais necessário para a animação antiga

export default function AppLayout() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Inicializa o auth apenas no lado do cliente
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
      // Mantive o bg-gray-900 para consistência, mas restaurei o spinner antigo
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-100">
      
      {/* --- SIDEBAR DESKTOP --- */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 z-50 border-r border-gray-800 bg-gray-900">
        <Sidebar type="user" />
      </aside>

      {/* --- ÁREA PRINCIPAL --- */}
      <main className="flex-1 flex flex-col min-h-screen md:pl-64 transition-all duration-300">
        
        {/* Mobile Navigation */}
        <MobileNav type="user" />

        {/* --- CONTEÚDO --- */}
        <div className="flex-1 p-4 md:p-8 overflow-x-hidden mb-20 md:mb-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}