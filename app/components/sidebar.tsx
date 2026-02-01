import { NavLink, useNavigate } from "react-router";
import { 
  // Ícones Compartilhados
  LogOut, ChevronRight, User, Smartphone,
  // Ícones User
  LayoutDashboard, TrendingUp, TrendingDown, Car, Calendar, Target,
  // Ícones Admin
  Users, Wallet, ShieldCheck
} from "lucide-react";
import { auth } from "~/lib/firebase.client";

interface SidebarProps {
  type?: "user" | "admin";
}

export function Sidebar({ type = "user" }: SidebarProps) {
  const navigate = useNavigate();
  const isAdmin = type === "admin";
  
  // Dados do usuário
  const user = auth.currentUser;
  const displayName = user?.displayName || (isAdmin ? "Administrador" : "Motorista");
  const photoURL = user?.photoURL;

  // --- CONFIGURAÇÃO DE TEMAS ---
  const theme = isAdmin ? {
    // TEMA ADMIN (Claro / Profissional)
    wrapper: "bg-white border-r border-gray-200 dark:bg-zinc-900 dark:border-zinc-800",
    headerTitle: "text-gray-900 dark:text-gray-100",
    headerSubtitle: "text-gray-500 dark:text-gray-400",
    logoIcon: "text-indigo-600 dark:text-indigo-400",
    activeItem: "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800 shadow-sm",
    inactiveItem: "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-gray-200",
    footerBg: "bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-200 dark:border-zinc-800",
    profileName: "text-gray-700 dark:text-gray-200",
    profileSub: "text-gray-500 dark:text-gray-400",
    backButton: "text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/10 dark:border-indigo-900/30",
    logoutButton: "text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:bg-red-900/10",
  } : {
    // TEMA USER (Escuro / App)
    wrapper: "bg-gray-900 border-r border-gray-800",
    headerTitle: "text-emerald-500",
    headerSubtitle: "text-gray-500",
    logoIcon: "text-emerald-500",
    activeItem: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm",
    inactiveItem: "text-gray-400 hover:bg-gray-800 hover:text-gray-100",
    footerBg: "bg-gray-900/50 border-t border-gray-800",
    profileName: "text-gray-200",
    profileSub: "text-gray-500",
    backButton: "text-gray-300 bg-gray-800/50 border-gray-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-500",
    logoutButton: "text-gray-500 hover:text-red-400 hover:bg-red-500/5",
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  // --- LINKS ---
  const userItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Timeline", href: "/timeline", icon: Calendar },
    { label: "Ganhos", href: "/ganhos", icon: TrendingUp },
    { label: "Despesas", href: "/despesas", icon: TrendingDown },
    { label: "Veículos", href: "/veiculos", icon: Car },
    { label: "Metas", href: "/metas", icon: Target },
  ];

  const adminItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Usuários", href: "/admin/users", icon: Users },
    { label: "Finanças", href: "/admin/financials", icon: Wallet },
  ];

  const menuItems = isAdmin ? adminItems : userItems;

  return (
    <div className={`w-full h-full flex flex-col ${theme.wrapper}`}>
      
      {/* === CABEÇALHO === */}
      <div className={`p-6 ${isAdmin ? "border-b border-gray-100 dark:border-zinc-800" : "border-b border-gray-800"}`}>
        <div className="flex items-center gap-2">
           {isAdmin && <ShieldCheck size={24} className={theme.logoIcon} />}
           <div>
             <h1 className={`text-xl font-bold tracking-tight ${theme.headerTitle}`}>
               {isAdmin ? "Painel Admin" : "Financial Hub"}
             </h1>
             <p className={`text-xs mt-0.5 font-medium ${theme.headerSubtitle}`}>
               {isAdmin ? "Gestão do Sistema" : "Motorista Pro"}
             </p>
           </div>
        </div>
      </div>

      {/* === NAVEGAÇÃO === */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/" || item.href === "/admin/dashboard"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group border border-transparent ${
                isActive ? theme.activeItem : theme.inactiveItem
              }`
            }
          >
            <item.icon size={20} className="group-hover:scale-105 transition-transform" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* === RODAPÉ === */}
      <div className="flex flex-col gap-2 p-4 pb-2">
         {/* Botão Voltar ao App (Apenas Admin) */}
         {isAdmin && (
            <NavLink 
              to="/" 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all group ${theme.backButton}`}
            >
               <Smartphone size={20} className="group-hover:scale-110 transition-transform"/>
               <span className="font-medium text-sm">Ir para App</span>
            </NavLink>
         )}
      </div>

      {/* === PERFIL === */}
      <div className={`p-4 ${theme.footerBg}`}>
        <button 
          onClick={() => navigate("/perfil")}
          className="cursor-pointer flex items-center gap-3 w-full p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-200 group text-left mb-2 border border-transparent"
        >
          <div className="relative">
             <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border ${isAdmin ? "bg-indigo-600 border-indigo-500 text-white" : "bg-gray-800 border-gray-700 text-emerald-500"}`}>
                {photoURL ? (
                  <img src={photoURL} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <User size={18} />
                )}
             </div>
          </div>
          
          <div className="flex-1 min-w-0">
             <p className={`text-sm font-semibold truncate ${theme.profileName}`}>
               {displayName}
             </p>
             <p className={`text-[10px] font-medium flex items-center gap-1 ${theme.profileSub}`}>
               Minha Conta <ChevronRight size={10} />
             </p>
          </div>
        </button>

        <button
          onClick={handleLogout}
          className={`cursor-pointer flex items-center gap-2 px-3 py-2 w-full text-xs font-medium rounded-lg transition-colors group mt-1 pl-4 ${theme.logoutButton}`}
        >
          <LogOut size={14} />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}