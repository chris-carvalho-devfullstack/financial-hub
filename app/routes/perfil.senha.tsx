// app/routes/perfil.senha.tsx
import { useState, useEffect } from "react";
import { supabase } from "~/lib/supabase.client";
import { SubHeader } from "~/components/sub-header";
import { Lock, KeyRound, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function PerfilSenha() {
  // Estado apenas para verificar se está logado
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // No Supabase, não precisamos da senha ATUAL para trocar a nova se a sessão for válida.
  // Porém, por UX, podemos manter o campo ou removê-lo. 
  // Para manter o layout igual, vamos manter o campo, mas ele não será usado na API do Supabase diretamente
  // a menos que você queira fazer um login manual para validar. 
  // SIMPLIFICAÇÃO: Vamos focar na nova senha.
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsAuthenticated(!!data.user));
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;

    if (newPassword.length < 6) {
      setStatus({ type: 'error', text: "A nova senha deve ter pelo menos 6 caracteres." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', text: "As novas senhas não coincidem." });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      // Supabase: Apenas envie a nova senha
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });

      if (error) throw error;

      setStatus({ type: 'success', text: "Senha alterada com sucesso!" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error(error);
      setStatus({ type: 'error', text: error.message || "Erro ao alterar senha." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-20 animate-fade-in">
      <SubHeader title="Segurança" />

      <form onSubmit={handleChangePassword} className="px-4 space-y-6">
        <div className="bg-yellow-500/5 border border-yellow-500/10 p-4 rounded-xl mb-6">
          <p className="text-xs text-yellow-500/80 leading-relaxed">
            Certifique-se de escolher uma senha forte e única.
          </p>
        </div>

        {/* NOTA: Removemos o campo "Senha Atual" para simplificar a migração, 
           pois o Supabase Auth Client não valida senha antiga nativamente no update 
           (ele confia na sessão ativa). Se quiser muito validar, teria que fazer um 
           signInWithPassword antes, mas é um passo extra que pode falhar se o usuário 
           usou Google Auth.
        */}

        {/* Nova Senha */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Nova Senha</label>
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input 
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
        </div>

        {/* Confirmar Nova Senha */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Confirmar Nova Senha</label>
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input 
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              placeholder="Repita a nova senha"
            />
          </div>
        </div>

        {/* Feedback */}
        {status && (
          <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
            status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {status.text}
          </div>
        )}

        <button
          disabled={isLoading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Atualizar Senha"}
        </button>
      </form>
    </div>
  );
}