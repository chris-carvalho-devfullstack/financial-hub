// app/routes/admin.tsx
import { Outlet, redirect } from "react-router";
import type { Route } from "./+types/admin";
import { Sidebar } from "~/components/sidebar";
import { MobileNav } from "~/components/mobile-nav";
import { getAuth } from "firebase/auth";
import { app } from "~/lib/app/firebase.client";

// Loader de proteção de rota
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const auth = getAuth(app);
  await auth.authStateReady();
  if (!auth.currentUser) {
    return redirect("/login");
  }
  return null;
}

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-950">
      
      {/* --- SIDEBAR DESKTOP --- 
          - Escondida no mobile (hidden)
          - Flexível no desktop (md:flex)
          - Fixa na lateral esquerda
          - MODO ADMIN ATIVADO (type="admin")
      */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 z-50 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <Sidebar type="admin" />
      </aside>

      {/* --- ÁREA PRINCIPAL --- */}
      <main className="flex-1 flex flex-col min-h-screen md:pl-64 transition-all duration-300">
        
        {/* --- MOBILE NAVIGATION ---
            - MODO ADMIN ATIVADO (type="admin")
            - Isso ativa as cores roxas e os menus de gestão
        */}
        <MobileNav type="admin" />

        {/* --- CONTEÚDO DA PÁGINA --- 
            mb-20: Adiciona margem no fundo APENAS no mobile, para o conteúdo não ficar atrás da barra de navegação inferior.
            md:mb-0: No desktop, remove essa margem.
        */}
        <div className="flex-1 p-4 md:p-8 overflow-x-hidden mb-20 md:mb-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}