import { Outlet, Link, useLocation } from "react-router";
import { LayoutDashboard, Users, TrendingUp, Settings, LogOut } from "lucide-react";

export default function AdminLayout() {
  const location = useLocation();
  const menu = [
    { name: "Visão Geral", path: "/admin", icon: LayoutDashboard },
    { name: "Usuários & Assinantes", path: "/admin/users", icon: Users },
    { name: "Financeiro da Plataforma", path: "/admin/financials", icon: TrendingUp },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <span className="text-xl font-bold text-emerald-400">Admin Hub</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {menu.map((item) => (
            <Link key={item.path} to={item.path} 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                location.pathname === item.path ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-slate-800"
              }`}>
              <item.icon size={18} />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}