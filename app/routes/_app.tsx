// app/routes/_app.tsx
import { Outlet, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Sidebar } from "~/components/sidebar";
import { MobileNav } from "~/components/mobile-nav";
import { supabase } from "~/lib/supabase.client"; // ✅ Agora usa Supabase

export default function AppLayout() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Verifica a sessão inicial ao carregar a página
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      }
      setLoading(false);
    };

    checkSession();

    // 2. Escuta mudanças em tempo real (ex: logout em outra aba, token expirado)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
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