// app/components/mobile-nav.tsx
import { NavLink, useNavigate } from "react-router";
import { useState } from "react";
import { 
  // Ícones Gerais
  Menu, X, LogOut, ChevronRight, User, Smartphone,
  // Ícones User
  LayoutDashboard, TrendingUp, TrendingDown, Car, Calendar, Target,
  // Ícones Admin
  Users, Wallet, ShieldCheck
} from "lucide-react";
import { auth } from "~/lib/firebase.client";

interface MobileNavProps {
  type?: "user" | "admin";
}

export function MobileNav({ type = "user" }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const isAdmin = type === "admin";
  
  const user = auth.currentUser;
  const displayName = user?.displayName || (isAdmin ? "Administrador" : "Motorista");
  const email = user?.email;
  const photoURL = user?.photoURL;

  // --- DEFINIÇÃO DE TEMAS ---
  const theme = isAdmin ? {
    // TEMA ADMIN: Roxo + Fundo Claro (Visual de Gestão)
    drawerBg: "bg-white dark:bg-zinc-900",
    drawerBorder: "border-gray-200 dark:border-zinc-800",
    headerBg: "bg-purple-50 dark:bg-purple-900/10",
    headerText: "text-purple-900 dark:text-purple-100",
    iconColor: "text-purple-600 dark:text-purple-400",
    activeItemBg: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    inactiveItemText: "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800",
    bottomNavBg: "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800",
    bottomActiveText: "text-purple-600 dark:text-purple-400",
    bottomActiveBg: "bg-purple-50 dark:bg-purple-900/20",
  } : {
    // TEMA USER: Verde + Fundo Escuro (Visual "App/Noturno")
    drawerBg: "bg-gray-900",
    drawerBorder: "border-gray-800",
    headerBg: "bg-gray-800",
    headerText: "text-gray-100",
    iconColor: "text-emerald-500",
    activeItemBg: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    inactiveItemText: "text-gray-400 hover:bg-gray-800 hover:text-gray-200",
    bottomNavBg: "bg-gray-900 border-gray-800",
    bottomActiveText: "text-emerald-400",
    bottomActiveBg: "bg-emerald-500/10",
  };

  // --- LINKS ---
  const userBottomItems = [
    { label: "Visão", href: "/", icon: LayoutDashboard },
    { label: "Timeline", href: "/timeline", icon: Calendar },
    { label: "Ganhos", href: "/ganhos", icon: TrendingUp },
    { label: "Saídas", href: "/despesas", icon: TrendingDown },
  ];
  
  const userDrawerItems = [
    { label: "Meus Veículos", href: "/veiculos", icon: Car },
    { label: "Minhas Metas", href: "/metas", icon: Target },
  ];

  const adminBottomItems = [
    { label: "Dash", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Usuários", href: "/admin/users", icon: Users },
    { label: "Finanças", href: "/admin/financials", icon: Wallet },
  ];

  const bottomItems = isAdmin ? adminBottomItems : userBottomItems;

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  const handleProfileClick = () => {
    setIsOpen(false);
    navigate("/perfil");
  };

  return (
    <>
      {/* === DRAWER (MENU LATERAL) === */}
      <div 
        className={`fixed inset-0 z-[60] flex justify-end transition-all duration-300 ${
          isOpen ? "visible pointer-events-auto" : "invisible pointer-events-none"
        }`}
      >
        {/* Backdrop (Fundo escuro ao abrir) */}
        <div 
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsOpen(false)}
        />

        {/* Container do Menu */}
        <div 
          className={`relative w-72 h-full shadow-2xl flex flex-col transition-transform duration-300 ease-out border-l ${
            theme.drawerBg
          } ${theme.drawerBorder} ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          
          {/* === HEADER DO DRAWER === */}
          {isAdmin ? (
            // --- Header ADMIN (Claro/Roxo) ---
            <div className={`p-6 border-b ${theme.drawerBorder} ${theme.headerBg}`}>
              <div className="flex justify-between items-start mb-4">
                 <div className={`p-2 rounded-lg bg-white shadow-sm ${theme.iconColor}`}>
                    <ShieldCheck size={24} />
                 </div>
                 <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X size={24} />
                 </button>
              </div>
              <div>
                <h2 className={`font-bold text-lg ${theme.headerText}`}>Painel Admin</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Gestão do Sistema</p>
              </div>
            </div>
          ) : (
            // --- Header USER (Escuro/Verde) ---
            <div className={`p-4 border-b ${theme.drawerBorder} ${theme.headerBg}`}>
               <div className="flex items-start justify-between mb-4">
                 <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-100 p-1 ml-auto">
                    <X size={24} />
                 </button>
               </div>
               <button onClick={handleProfileClick} className="flex items-center gap-4 w-full p-2 -ml-2 rounded-xl hover:bg-white/5 active:bg-white/10 transition-all group text-left">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 p-0.5 bg-gray-900 overflow-hidden flex items-center justify-center shadow-lg group-hover:border-emerald-500 transition-colors">
                      {photoURL ? <img src={photoURL} className="w-full h-full rounded-full object-cover"/> : <User className="w-6 h-6 text-emerald-500" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-100 truncate group-hover:text-emerald-400 transition-colors">{displayName}</p>
                    <div className="flex items-center text-xs text-gray-500 mt-0.5 font-medium"><span>Ver perfil</span><ChevronRight size={12} className="ml-1" /></div>
                  </div>
               </button>
            </div>
          )}

          {/* === INFO DO ADMIN (Aparece abaixo do header apenas para Admin) === */}
          {isAdmin && (
            <div className={`px-6 py-4 flex items-center gap-3 border-b ${theme.drawerBorder}`}>
               <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                  {photoURL ? <img src={photoURL} className="w-full h-full rounded-full object-cover"/> : (displayName[0] || 'A')}
               </div>
               <div className="overflow-hidden">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{displayName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{email}</p>
               </div>
            </div>
          )}

          {/* === LISTA DE NAVEGAÇÃO === */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pl-2">Menu Principal</p>
            
            {/* Links Admin */}
            {isAdmin && adminBottomItems.map(item => (
               <NavLink key={item.href} to={item.href} onClick={() => setIsOpen(false)} 
                 className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive ? theme.activeItemBg : theme.inactiveItemText}`}>
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
               </NavLink>
            ))}

            {/* Links User */}
            {!isAdmin && userDrawerItems.map(item => (
               <NavLink key={item.href} to={item.href} onClick={() => setIsOpen(false)} 
                 className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive ? theme.activeItemBg : theme.inactiveItemText}`}>
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
               </NavLink>
            ))}
          </nav>

          {/* === FOOTER === */}
          <div className={`p-4 border-t ${theme.drawerBorder} space-y-2`}>
            {isAdmin && (
              <NavLink to="/" className="flex items-center gap-3 px-4 py-3 w-full text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 rounded-lg transition-all border border-purple-100 dark:border-purple-800">
                 <Smartphone size={20} />
                 <span className="font-medium">App Motorista</span>
              </NavLink>
            )}

            <button onClick={handleLogout} className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-all ${isAdmin ? "text-gray-600 hover:bg-red-50 hover:text-red-600 dark:text-gray-400" : "text-gray-400 hover:bg-red-500/10 hover:text-red-400"}`}>
              <LogOut size={20} />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* === BARRA INFERIOR (BOTTOM NAV) === */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t pb-safe pt-2 px-4 flex justify-between items-center z-40 h-16 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] ${theme.bottomNavBg}`}>
        
        {bottomItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/" || item.href === "/admin/dashboard"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 transition-all duration-200 min-w-[3.5rem] ${
                isActive
                  ? `${theme.bottomActiveText} -translate-y-1`
                  : `text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300`
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-xl transition-colors ${isActive ? theme.bottomActiveBg : 'bg-transparent'}`}>
                   <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Botão Menu (Abre Drawer) */}
        <button
          onClick={() => setIsOpen(true)}
          className={`flex flex-col items-center gap-1 transition-all duration-200 min-w-[3.5rem] ${
            isOpen 
              ? `${theme.bottomActiveText}`
              : `text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300`
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${isOpen ? theme.bottomActiveBg : 'bg-transparent'}`}>
            <Menu size={22} strokeWidth={isOpen ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-medium tracking-wide">Menu</span>
        </button>
      </nav>
    </>
  );
}