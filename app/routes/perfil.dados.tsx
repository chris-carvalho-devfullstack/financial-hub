// app/routes/perfil.dados.tsx
import { useState, useEffect } from "react";
import { supabase } from "~/lib/supabase.client";
import { SubHeader } from "~/components/sub-header";
import { User, Mail, Link as LinkIcon, Save, Loader2 } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function PerfilDados() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [name, setName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Carrega dados iniciais
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        // Tenta pegar do metadata
        setName(data.user.user_metadata?.full_name || data.user.user_metadata?.name || "");
        setPhotoURL(data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || "");
      }
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    setMessage(null);

    try {
      // 1. Atualiza no Auth (Sessão / Login)
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: name,
          avatar_url: photoURL,
          name: name, // redundância para compatibilidade
          photo_url: photoURL // redundância
        }
      });

      if (authError) throw authError;

      // 2. Sincroniza na Tabela 'profiles' (Banco de Dados Público)
      // Usamos 'upsert' para garantir que crie se não existir
      const { error: dbError } = await supabase.from('profiles').upsert({
        id: user.id,
        name: name,
        // photo_url se sua tabela tiver esse campo, ou avatar_url. 
        // No roadmap definimos 'name' e 'email', vamos assumir que pode ter mais campos ou apenas esses.
        email: user.email, 
        // updated_at: new Date().toISOString() // Supabase gerencia isso se configurado, ou passamos
      });

      if (dbError) {
          console.warn("Erro ao atualizar tabela profiles:", dbError);
          // Não bloqueamos o sucesso visual se apenas o DB falhar mas o Auth passar, 
          // mas idealmente ambos devem funcionar.
      }

      setMessage({ type: 'success', text: "Perfil atualizado e sincronizado!" });
    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: error.message || "Erro ao atualizar." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-20 animate-fade-in">
      <SubHeader title="Dados Pessoais" />

      <form onSubmit={handleSave} className="px-4 space-y-6">
        {/* Preview da Foto */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 rounded-full border-2 border-emerald-500/30 bg-gray-800 overflow-hidden">
            {photoURL ? (
              <img src={photoURL} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <User size={40} />
              </div>
            )}
          </div>
        </div>

        {/* Campo Nome */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Nome Completo</label>
          <div className="relative">
            <User className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              placeholder="Seu nome"
            />
          </div>
        </div>

        {/* Campo Email (Read Only) */}
        <div className="space-y-2 opacity-60">
          <label className="text-xs font-semibold text-gray-500 uppercase ml-1">E-mail (Não editável)</label>
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input 
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-gray-400 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Campo Foto URL */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase ml-1">URL da Foto</label>
          <div className="relative">
            <LinkIcon className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input 
              type="url"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-sm"
              placeholder="https://exemplo.com/foto.jpg"
            />
          </div>
          <p className="text-[10px] text-gray-500 ml-1">Cole um link direto de uma imagem da web.</p>
        </div>

        {/* Mensagem de Feedback */}
        {message && (
          <div className={`p-3 rounded-lg text-sm text-center ${
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Botão Salvar */}
        <button
          disabled={isLoading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              <Save size={20} />
              Salvar Alterações
            </>
          )}
        </button>
      </form>
    </div>
  );
}