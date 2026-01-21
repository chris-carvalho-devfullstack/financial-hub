import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router";
import { Sidebar } from "~/components/sidebar";
import { MobileNav } from "~/components/mobile-nav";
import { auth } from "~/lib/firebase.client";
import { LogOut } from "lucide-react";

export default function AppLayout() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/login");
      } else {
        setIsChecking(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* === DESKTOP: Sidebar Lateral === */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* === MOBILE: Header Simples === */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-gray-900/90 backdrop-blur border-b border-gray-800 flex items-center justify-between px-4 z-40">
        <h1 className="text-lg font-bold text-emerald-500">Financial Hub</h1>
        <button onClick={() => auth.signOut()} className="text-gray-400">
          <LogOut size={20} />
        </button>
      </div>

      {/* === ÁREA DE CONTEÚDO === */}
      {/* No Desktop: padding-left-64. No Mobile: padding-bottom-20 e padding-top-20 */}
      <main className="md:pl-64 pt-20 pb-24 md:py-8 px-4 md:px-8 max-w-7xl mx-auto min-h-screen">
        <Outlet />
      </main>

      {/* === MOBILE: Menu Inferior === */}
      <MobileNav />
    </div>
  );
}