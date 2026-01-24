// app/routes/perfil.preferencias.tsx
import { useState, useEffect } from "react"; // Add useEffect
import { useLocation } from "react-router";   // Add useLocation
import { SubHeader } from "~/components/sub-header";
import { Moon, Sun, Bell, Volume2, Globe } from "lucide-react";

export default function PerfilPreferencias() {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [sounds, setSounds] = useState(false);
  
  // === NOVO: Lógica de Rolagem Automática ===
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.substring(1));
      if (element) {
        // Pequeno delay para garantir que a renderização terminou
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          // Opcional: Efeito visual de destaque
          element.classList.add("bg-emerald-500/5");
          setTimeout(() => element.classList.remove("bg-emerald-500/5"), 1000);
        }, 100);
      }
    }
  }, [location]);

  const Toggle = ({ active, onToggle }: { active: boolean, onToggle: () => void }) => (
    <button 
      onClick={onToggle}
      className={`cursor-pointer w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${
        active ? "bg-emerald-500" : "bg-gray-700"
      }`}
    >
      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
        active ? "translate-x-6" : "translate-x-0"
      }`} />
    </button>
  );

  return (
    <div className="max-w-xl mx-auto pb-20 animate-fade-in">
      <SubHeader title="Preferências" />

      <div className="px-4 space-y-8">
        
        {/* Aparência */}
        <section id="aparencia" className="transition-colors duration-500 rounded-xl">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 ml-1">
            Aparência
          </h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-800">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-800 rounded-lg text-emerald-500">
                  {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <p className="font-medium text-gray-200">Modo Escuro</p>
                  <p className="text-xs text-gray-500">Economiza bateria</p>
                </div>
              </div>
              <Toggle active={darkMode} onToggle={() => setDarkMode(!darkMode)} />
            </div>
          </div>
        </section>

        {/* Notificações - ID ADICIONADO AQUI */}
        <section id="notificacoes" className="transition-colors duration-500 rounded-xl">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 ml-1">
            Notificações e Sons
          </h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-800">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-800 rounded-lg text-emerald-500">
                  <Bell size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-200">Push Notifications</p>
                  <p className="text-xs text-gray-500">Alertas de metas e gastos</p>
                </div>
              </div>
              <Toggle active={notifications} onToggle={() => setNotifications(!notifications)} />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-800 rounded-lg text-emerald-500">
                  <Volume2 size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-200">Sons no App</p>
                  <p className="text-xs text-gray-500">Efeitos sonoros ao clicar</p>
                </div>
              </div>
              <Toggle active={sounds} onToggle={() => setSounds(!sounds)} />
            </div>
          </div>
        </section>

         {/* Geral */}
         <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 ml-1">
            Geral
          </h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
             <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-800 rounded-lg text-emerald-500">
                  <Globe size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-200">Idioma</p>
                  <p className="text-xs text-gray-500">Português (Brasil)</p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}