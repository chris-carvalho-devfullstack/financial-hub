// app/routes/perfil.suporte.tsx
import { useEffect } from "react";
import { useLocation } from "react-router";
import { SubHeader } from "~/components/sub-header";
import { HelpCircle, MessageCircle, FileText, ChevronDown } from "lucide-react";

export default function PerfilSuporte() {
  // === NOVO: Lógica de Rolagem ===
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.substring(1));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          // Highlight visual
          element.classList.add("ring-2", "ring-emerald-500/50");
          setTimeout(() => element.classList.remove("ring-2", "ring-emerald-500/50"), 1500);
        }, 100);
      }
    }
  }, [location]);

  const faqs = [
    { 
      q: "Como exportar meus dados?", 
      a: "Atualmente a exportação é feita automaticamente no fechamento do mês, enviada para seu e-mail cadastrado." 
    },
    { 
      q: "Como alterar a meta de ganhos?", 
      a: "Vá até a aba 'Metas' no menu principal e clique no ícone de lápis no card de Ganhos." 
    },
    { 
      q: "O app funciona offline?", 
      a: "Sim! Você pode registrar gastos e ganhos sem internet. Eles serão sincronizados quando conectar novamente." 
    },
  ];

  return (
    <div className="max-w-xl mx-auto pb-20 animate-fade-in">
      <SubHeader title="Ajuda e Suporte" />

      <div className="px-4 space-y-8">
        
        {/* Contato Rápido */}
        <section className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <MessageCircle size={28} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Precisa de ajuda urgente?</h2>
              <p className="text-emerald-100 text-sm mt-1 leading-relaxed">
                Nossa equipe de suporte está disponível via WhatsApp para resolver seus problemas.
              </p>
              <button className="cursor-pointer mt-4 bg-white text-emerald-700 px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-50 transition-colors">
                Falar no WhatsApp
              </button>
            </div>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section>
          <h2 className="text-lg font-bold text-gray-100 mb-4 flex items-center gap-2">
            <HelpCircle size={20} className="text-emerald-500" />
            Perguntas Frequentes
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <details key={idx} className="group bg-gray-900 border border-gray-800 rounded-xl overflow-hidden transition-all duration-300 open:bg-gray-800/50">
                <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                  <span className="font-medium text-gray-200">{faq.q}</span>
                  <ChevronDown size={18} className="text-gray-500 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-4 pt-0 text-sm text-gray-400 leading-relaxed border-t border-gray-800/0 group-open:border-gray-700/50 group-open:pt-3">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Links Úteis - ID ADICIONADO AQUI */}
        <section id="privacidade" className="transition-all duration-500 rounded-xl">
           <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 ml-1 mt-6">
            Legal
          </h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-800">
             <button className="cursor-pointer w-full flex items-center gap-3 p-4 hover:bg-gray-800 text-left">
               <FileText size={20} className="text-gray-400" />
               <span className="text-gray-300 text-sm">Termos de Uso</span>
             </button>
             <button className="cursor-pointer w-full flex items-center gap-3 p-4 hover:bg-gray-800 text-left">
               <FileText size={20} className="text-gray-400" />
               <span className="text-gray-300 text-sm">Política de Privacidade</span>
             </button>
          </div>
        </section>

      </div>
    </div>
  );
}