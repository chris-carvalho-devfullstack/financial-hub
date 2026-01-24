// app/routes/perfil.dados.tsx
import { useState } from "react";
import { updateProfile } from "firebase/auth";
import { auth } from "~/lib/firebase.client";
import { SubHeader } from "~/components/sub-header";
import { User, Mail, Link as LinkIcon, Save, Loader2 } from "lucide-react";

export default function PerfilDados() {
  const user = auth.currentUser;
  
  const [name, setName] = useState(user?.displayName || "");
  const [photoURL, setPhotoURL] = useState(user?.photoURL || "");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    setMessage(null);

    try {
      await updateProfile(user, {
        displayName: name,
        photoURL: photoURL
      });
      setMessage({ type: 'success', text: "Perfil atualizado com sucesso!" });
    } catch (error) {
      setMessage({ type: 'error', text: "Erro ao atualizar. Tente novamente." });
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