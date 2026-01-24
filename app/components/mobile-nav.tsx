// app/components/mobile-nav.tsx
import { NavLink, useNavigate } from "react-router";
import { useState } from "react";
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  Car, 
  Calendar,
  Menu,    // Botão "Mais"
  X,       // Fechar
  Target,  // Metas
  LogOut,  // Sair
  User,    // Ícone de fallback para foto
  ChevronRight // Indicador de clique
} from "lucide-react";
import { auth } from "~/lib/firebase.client";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  
  // Acessa dados do usuário atual (pode ser null se não carregou ainda)
  const user = auth.currentUser;
  const displayName = user?.displayName || "Motorista";
  const photoURL = user?.photoURL;

  // Itens da barra inferior fixa
  const bottomNavItems = [
    { label: "Visão", href: "/", icon: LayoutDashboard },
    { label: "Timeline", href: "/timeline", icon: Calendar },
    { label: "Ganhos", href: "/ganhos", icon: TrendingUp },
    { label: "Saídas", href: "/despesas", icon: TrendingDown },
  ];

  // Itens do menu lateral (Drawer)
  const drawerItems = [
    { label: "Carros", href: "/veiculos", icon: Car },
    { label: "Metas", href: "/metas", icon: Target },
  ];

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  const handleProfileClick = () => {
    setIsOpen(false);
    navigate("/perfil"); // Redireciona para a página de perfil
  };

  return (
    <>
      {/* === SIDEMENU / DRAWER MOBILE === */}
      <div 
        className={`fixed inset-0 z-[60] flex justify-end transition-visibility duration-300 ${
          isOpen ? "visible" : "invisible pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div 
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsOpen(false)}
        />

        {/* Conteúdo do Menu */}
        <div 
          className={`relative w-72 bg-gray-900 border-l border-gray-800 h-full shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* === CABEÇALHO DO PERFIL (NOVO) === */}
          <div className="p-4 border-b border-gray-800 bg-gray-900/50">
            <div className="flex items-start justify-between mb-4">
               {/* Botão Fechar no topo direito */}
               <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-100 p-1 ml-auto"
              >
                <X size={24} />
              </button>
            </div>

            {/* Cartão de Perfil Clicável */}
            <button 
              onClick={handleProfileClick}
              className="flex items-center gap-4 w-full p-2 -ml-2 rounded-xl hover:bg-gray-800/50 active:bg-gray-800 transition-all group text-left"
            >
              {/* Foto / Avatar Circular */}
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 p-0.5 bg-gray-800 overflow-hidden flex items-center justify-center shadow-lg group-hover:border-emerald-500 transition-colors">
                  {photoURL ? (
                    <img 
                      src={photoURL} 
                      alt="Foto de perfil" 
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <User className="w-6 h-6 text-emerald-500" />
                  )}
                </div>
              </div>

              {/* Nome e Link */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-100 truncate group-hover:text-emerald-400 transition-colors">
                  {displayName}
                </p>
                <div className="flex items-center text-xs text-gray-500 mt-0.5 font-medium">
                  <span>Ver perfil</span>
                  <ChevronRight size={12} className="ml-1" />
                </div>
              </div>
            </button>
          </div>

          {/* Lista de Opções Extras */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pl-2">
              Menu Principal
            </p>
            {drawerItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setIsOpen(false)}
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

          {/* Botão de Sair */}
          <div className="p-4 border-t border-gray-800">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <LogOut size={20} />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* === BARRA INFERIOR === */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 pb-safe pt-2 px-4 flex justify-between items-center z-40 h-16 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 transition-all duration-200 min-w-[3.5rem] ${
                isActive
                  ? "text-emerald-400 scale-105"
                  : "text-gray-500 hover:text-gray-300"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Botão Mais */}
        <button
          onClick={() => setIsOpen(true)}
          className={`flex flex-col items-center gap-1 transition-all duration-200 min-w-[3.5rem] ${
            isOpen ? "text-emerald-400 scale-105" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <Menu size={22} strokeWidth={isOpen ? 2.5 : 2} />
          <span className="text-[10px] font-medium tracking-wide">Mais</span>
        </button>
      </nav>
    </>
  );
}