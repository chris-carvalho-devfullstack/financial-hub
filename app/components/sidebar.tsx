// app/components/sidebar.tsx
import { NavLink, useNavigate } from "react-router";
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  Car, 
  LogOut,
  Calendar // <--- 1. Importado novo ícone
} from "lucide-react";
import { auth } from "~/lib/firebase.client";

export function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  const menuItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Timeline", href: "/timeline", icon: Calendar }, // <--- 2. Item adicionado
    { label: "Ganhos", href: "/ganhos", icon: TrendingUp },
    { label: "Despesas", href: "/despesas", icon: TrendingDown },
    { label: "Veículos", href: "/veiculos", icon: Car },
  ];

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-emerald-500 tracking-tight">
          Financial Hub
        </h1>
        <p className="text-xs text-gray-500 mt-1">Motorista Pro</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
              }`
            }
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
        >
          <LogOut size={20} />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
}