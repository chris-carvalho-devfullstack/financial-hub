// app/routes/admin.tsx
import { Outlet, redirect } from "react-router";
import type { Route } from "./+types/admin";
import { Sidebar } from "~/components/sidebar";
import { MobileNav } from "~/components/mobile-nav";
import { supabase } from "~/lib/supabase.client";

// Loader de proteção de rota
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return redirect("/login");
  }

  // Opcional: Verificar se o usuário é ADMIN na tabela profiles
  // const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  // if (profile?.role !== 'ADMIN') return redirect("/dashboard");

  return null;
}

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-950">
      
      {/* --- SIDEBAR DESKTOP --- */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 z-50 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <Sidebar type="admin" />
      </aside>

      {/* --- ÁREA PRINCIPAL --- */}
      <main className="flex-1 flex flex-col min-h-screen md:pl-64 transition-all duration-300">
        
        {/* --- MOBILE NAVIGATION --- */}
        <MobileNav type="admin" />

        {/* --- CONTEÚDO DA PÁGINA --- */}
        <div className="flex-1 p-4 md:p-8 overflow-x-hidden mb-20 md:mb-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}