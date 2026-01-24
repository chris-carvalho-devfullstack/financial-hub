// app/components/sidebar.tsx
import { NavLink, useNavigate } from "react-router";
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  Car, 
  LogOut,
  Calendar,
  Target,
  User,
  ChevronRight
} from "lucide-react";
import { auth } from "~/lib/firebase.client";

export function Sidebar() {
  const navigate = useNavigate();
  
  // Dados do usuário
  const user = auth.currentUser;
  const displayName = user?.displayName || "Motorista";
  const photoURL = user?.photoURL;

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  const menuItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Timeline", href: "/timeline", icon: Calendar },
    { label: "Ganhos", href: "/ganhos", icon: TrendingUp },
    { label: "Despesas", href: "/despesas", icon: TrendingDown },
    { label: "Veículos", href: "/veiculos", icon: Car },
    { label: "Metas", href: "/metas", icon: Target },
  ];

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen fixed left-0 top-0 z-50">
      {/* === CABEÇALHO === */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-emerald-500 tracking-tight flex items-center gap-2">
          Financial Hub
        </h1>
        <p className="text-xs text-gray-500 mt-1 font-medium pl-0.5">Motorista Pro</p>
      </div>

      {/* === NAVEGAÇÃO === */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
              }`
            }
          >
            <item.icon size={20} className="group-hover:scale-105 transition-transform" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* === RODAPÉ / PERFIL === */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/50">
        
        {/* Cartão de Perfil (Com cursor-pointer) */}
        <button 
          onClick={() => navigate("/perfil")}
          className="cursor-pointer flex items-center gap-3 w-full p-3 rounded-xl hover:bg-gray-800 transition-all duration-200 group text-left mb-2 border border-transparent hover:border-gray-700/50"
        >
          <div className="relative">
             <div className="absolute -inset-0.5 bg-emerald-500/20 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
             <div className="relative w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center overflow-hidden group-hover:border-emerald-500/50 transition-colors">
                {photoURL ? (
                  <img src={photoURL} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <User size={18} className="text-emerald-500" />
                )}
             </div>
          </div>
          
          <div className="flex-1 min-w-0">
             <p className="text-sm font-semibold text-gray-200 truncate group-hover:text-emerald-400 transition-colors">
               {displayName}
             </p>
             <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1 group-hover:text-gray-400">
               Minha Conta <ChevronRight size={10} />
             </p>
          </div>
        </button>

        {/* Botão de Sair (Com cursor-pointer e alinhado à esquerda) */}
        <button
          onClick={handleLogout}
          className="cursor-pointer flex items-center gap-2 px-3 py-2 w-full text-xs font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors group mt-1 pl-4"
        >
          <LogOut size={14} className="group-hover:stroke-red-400" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}