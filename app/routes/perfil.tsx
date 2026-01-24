// app/routes/perfil.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { 
  User, 
  Mail, 
  Lock, 
  Shield, 
  Bell, 
  LogOut, 
  ChevronRight, 
  Camera, 
  HelpCircle,
  Smartphone
} from "lucide-react";
import { auth } from "~/lib/firebase.client";

export default function Perfil() {
  const navigate = useNavigate();
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (!u) navigate("/login");
      setUser(u);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  const MenuLink = ({ 
    icon: Icon, 
    label, 
    subLabel, 
    onClick, 
    danger = false 
  }: { 
    icon: any, 
    label: string, 
    subLabel?: string, 
    onClick?: () => void, 
    danger?: boolean 
  }) => (
    <button 
      onClick={onClick}
      className={`cursor-pointer w-full flex items-center justify-between p-4 transition-colors ${
        danger 
          ? "hover:bg-red-500/10 active:bg-red-500/20" 
          : "hover:bg-gray-800/50 active:bg-gray-800"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${
          danger ? "bg-red-500/10 text-red-400" : "bg-gray-800 text-emerald-500"
        }`}>
          <Icon size={20} />
        </div>
        <div className="text-left">
          <p className={`font-medium ${danger ? "text-red-400" : "text-gray-200"}`}>
            {label}
          </p>
          {subLabel && (
            <p className="text-xs text-gray-500 mt-0.5">{subLabel}</p>
          )}
        </div>
      </div>
      <ChevronRight size={18} className="text-gray-600" />
    </button>
  );

  return (
    <div className="animate-fade-in pb-10">
      <div className="relative bg-gray-900 border-b border-gray-800 pb-8 pt-10 px-6 mb-6">
        <div className="flex flex-col items-center">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative w-28 h-28 rounded-full border-4 border-gray-900 bg-gray-800 overflow-hidden flex items-center justify-center">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Perfil" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={48} className="text-gray-500" />
              )}
            </div>
            <button 
              onClick={() => navigate("/perfil/dados")} 
              className="cursor-pointer absolute bottom-1 right-1 bg-gray-800 text-emerald-400 p-2 rounded-full border border-gray-700 shadow-lg hover:bg-gray-700 hover:text-white transition-colors"
            >
              <Camera size={16} />
            </button>
          </div>

          <h1 className="mt-4 text-2xl font-bold text-white tracking-tight">
            {user?.displayName || "Motorista"}
          </h1>
          <p className="text-gray-400 flex items-center gap-2 mt-1 text-sm">
            <Mail size={14} />
            {user?.email}
          </p>
          
          <div className="mt-4 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-semibold text-emerald-400 uppercase tracking-wide">
            Plano Pro
          </div>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto space-y-6">
        
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 ml-2">
            Conta
          </h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-800">
            <MenuLink 
              icon={User} 
              label="Dados Pessoais" 
              subLabel="Nome, telefone e endereço"
              onClick={() => navigate("/perfil/dados")} 
            />
            <MenuLink 
              icon={Smartphone} 
              label="Preferências do App" 
              subLabel="Tema, idioma e visualização"
              onClick={() => navigate("/perfil/preferencias")}
            />
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 ml-2">
            Segurança
          </h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-800">
            <MenuLink 
              icon={Lock} 
              label="Alterar Senha" 
              onClick={() => navigate("/perfil/senha")} 
            />
            <MenuLink 
              icon={Shield} 
              label="Privacidade" 
              subLabel="Gerenciar compartilhamento de dados"
              // CORREÇÃO: Adicionado ancora #privacidade
              onClick={() => navigate("/perfil/suporte#privacidade")} 
            />
            <MenuLink 
              icon={Bell} 
              label="Notificações" 
              subLabel="Alertas de gastos e metas"
              // CORREÇÃO: Adicionado ancora #notificacoes
              onClick={() => navigate("/perfil/preferencias#notificacoes")} 
            />
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 ml-2">
            Outros
          </h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-800">
            <MenuLink 
              icon={HelpCircle} 
              label="Ajuda e Suporte" 
              onClick={() => navigate("/perfil/suporte")}
            />
            <MenuLink 
              icon={LogOut} 
              label="Sair da Conta" 
              danger
              onClick={handleLogout}
            />
          </div>
        </section>
        
        <p className="text-center text-xs text-gray-600 pt-4 pb-8">
          Financial Hub v1.0.0 • Feito com ❤️
        </p>
      </div>
    </div>
  );
}