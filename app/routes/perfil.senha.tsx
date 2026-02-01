// app/routes/perfil.senha.tsx
import { useState } from "react";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth } from "~/lib/app/firebase.client";
import { SubHeader } from "~/components/sub-header";
import { Lock, KeyRound, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function PerfilSenha() {
  const user = auth.currentUser;
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

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
      // 1. Re-autenticar o usuário (necessário para operações sensíveis)
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // 2. Atualizar a senha
      await updatePassword(user, newPassword);

      setStatus({ type: 'success', text: "Senha alterada com sucesso!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/wrong-password') {
        setStatus({ type: 'error', text: "A senha atual está incorreta." });
      } else {
        setStatus({ type: 'error', text: "Erro ao alterar senha. Tente novamente." });
      }
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
            Por segurança, você precisa confirmar sua senha atual antes de definir uma nova.
          </p>
        </div>

        {/* Senha Atual */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase ml-1">Senha Atual</label>
          <div className="relative">
            <KeyRound className="absolute left-4 top-3.5 text-gray-500" size={20} />
            <input 
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              placeholder="Sua senha atual"
            />
          </div>
        </div>

        <hr className="border-gray-800 my-4" />

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