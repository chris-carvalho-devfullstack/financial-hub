// app/routes/admin.users.tsx

import { useState, useEffect, useCallback } from "react";
import { 
  Eye, 
  Ban, 
  X, 
  Car, 
  AlertTriangle, 
  Shield, 
  Edit, 
  Check, 
  MoreVertical,
  Save,
  Loader2,
  AlertCircle
} from "lucide-react";
import { supabase } from "~/lib/supabase.client";
import type { UserProfile, Vehicle, Transaction } from "~/types/models";

// --- Sub-componente: Badge de Status (Mantido igual) ---
const StatusBadge = ({ status, type = 'status' }: { status: string, type?: 'status' | 'plan' | 'role' }) => {
  let colors = "bg-gray-100 text-gray-600 border-gray-200";
  
  if (type === 'status') {
    if (status === 'ACTIVE') colors = "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    if (status === 'BLOCKED') colors = "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
  } else if (type === 'plan') {
    if (status === 'PRO') colors = "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
  } else if (type === 'role') {
    if (status === 'ADMIN') colors = "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800";
  }

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors}`}>
      {status}
    </span>
  );
};

// --- Sub-componente: Modal de Confirmação ---
function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  confirmText = "Confirmar", 
  confirmColor = "red",
  isLoading = false
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  description: string; 
  confirmText?: string;
  confirmColor?: "red" | "indigo" | "green";
  isLoading?: boolean;
}) {
  if (!isOpen) return null;

  const colorClasses = {
    red: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    indigo: "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500",
    green: "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500"
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
       <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-4 mb-4">
             <div className={`p-3 rounded-full ${confirmColor === 'red' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
               <AlertCircle size={24} />
             </div>
             <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm leading-relaxed">
            {description}
          </p>
          <div className="flex justify-end gap-3">
             <button 
               onClick={onClose}
               disabled={isLoading}
               className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
             >
               Cancelar
             </button>
             <button 
               onClick={onConfirm}
               disabled={isLoading}
               className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2 cursor-pointer ${colorClasses[confirmColor]}`}
             >
               {isLoading && <Loader2 size={16} className="animate-spin" />}
               {confirmText}
             </button>
          </div>
       </div>
    </div>
  );
}

// --- Sub-componente: Modal de Edição ---
function EditUserModal({ 
  user, 
  isOpen, 
  onClose, 
  onSave 
}: { 
  user: UserProfile | null, 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (data: Partial<UserProfile>) => Promise<void> 
}) {
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    plan: 'FREE' | 'PRO';
    role: 'ADMIN' | 'USER';
  }>({ 
    name: '', 
    email: '', 
    plan: 'FREE', 
    role: 'USER' 
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        plan: (user.plan === 'PRO' ? 'PRO' : 'FREE'), 
        role: (user.role === 'ADMIN' ? 'ADMIN' : 'USER')
      });
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full h-full md:h-auto md:max-w-lg rounded-none md:rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Editar Usuário</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 cursor-pointer"><X size={20}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Completo</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email (Apenas leitura)</label>
            <input 
              type="email" 
              value={formData.email} 
              disabled
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-100 dark:bg-zinc-900 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Plano</label>
                <select 
                  value={formData.plan}
                  onChange={e => setFormData({...formData, plan: e.target.value as 'FREE' | 'PRO'})}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 cursor-pointer"
                >
                  <option value="FREE">FREE</option>
                  <option value="PRO">PRO</option>
                </select>
             </div>
             <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Função (Role)</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as 'ADMIN' | 'USER'})}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 cursor-pointer"
                >
                  <option value="USER">Usuário</option>
                  <option value="ADMIN">Administrador</option>
                </select>
             </div>
          </div>
        </form>
        
        <div className="p-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-3 bg-gray-50 dark:bg-zinc-900">
           <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer">Cancelar</button>
           <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 cursor-pointer">
             {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
             Salvar
           </button>
        </div>
      </div>
    </div>
  );
}

// --- Componente Principal ---
export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // States de Modais
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  
  const [confirmAction, setConfirmAction] = useState<{ type: 'block' | 'role', user: UserProfile } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  
  // Dados sob demanda
  const [userVehicles, setUserVehicles] = useState<Vehicle[]>([]);
  const [userStats, setUserStats] = useState({ income: 0, expense: 0 });
  const [loadingDetails, setLoadingDetails] = useState(false);

  // --- Listener do Supabase (Realtime) ---
  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
        setError("Erro ao carregar usuários.");
    } else if (data) {
        const mappedUsers = data.map(u => ({
            id: u.id,
            // uid mantido para compatibilidade com o resto do código que pode usar esse nome
            uid: u.id, 
            email: u.email || 'Sem email',
            name: u.name || 'Anônimo',
            plan: u.plan || 'FREE',
            subscriptionStatus: u.subscription_status || 'UNKNOWN',
            role: u.role || 'USER',
            photoUrl: u.photo_url || u.avatar_url,
            createdAt: u.created_at,
            lastLogin: u.last_login
        })) as unknown as UserProfile[];
        
        setUsers(mappedUsers);
        
        // Atualiza o user selecionado em tempo real se estiver aberto
        if (selectedUser) {
            const updated = mappedUsers.find(u => u.id === selectedUser.id);
            if (updated) setSelectedUser(updated);
        }
    }
    setLoading(false);
  }, [selectedUser]);

  useEffect(() => {
    fetchUsers();
    
    // Configura Realtime
    const channel = supabase.channel('admin-users-list')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            fetchUsers();
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); }
  }, [fetchUsers]);

  // --- Handlers ---
  const handleOpenUser = async (user: UserProfile) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
    setLoadingDetails(true);
    setUserVehicles([]);
    setUserStats({ income: 0, expense: 0 });

    try {
      // Fetch veículos
      const { data: vData } = await supabase.from('vehicles').select('*').eq('user_id', user.id);
      if (vData) {
          const mappedVehicles = vData.map(v => ({
              ...v,
              currentOdometer: v.current_odometer,
              userId: v.user_id
          }));
          setUserVehicles(mappedVehicles as any);
      }

      // Fetch Stats (Transactions)
      const { data: tData } = await supabase.from('transactions').select('amount, type').eq('user_id', user.id);
      if (tData) {
          let inc = 0, exp = 0;
          tData.forEach(t => {
              if (t.type === 'INCOME') inc += (t.amount || 0);
              else exp += (t.amount || 0);
          });
          setUserStats({ income: inc, expense: exp });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleEditClick = () => {
    if (selectedUser) {
      setUserToEdit(selectedUser);
    }
  };

  const handleSaveUser = async (data: Partial<UserProfile>) => {
    if (!userToEdit) return;
    try {
      // Mapeamento reverso (Frontend -> Banco)
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.plan) updateData.plan = data.plan;
      if (data.role) updateData.role = data.role;

      await supabase.from('profiles').update(updateData).eq('id', userToEdit.id);
    } catch (e) {
      alert("Erro ao salvar: " + e);
    }
  };

  const handleActionClick = (type: 'block' | 'role') => {
    if (selectedUser) {
      setConfirmAction({ type, user: selectedUser });
    }
  };

  const executeAction = async () => {
    if (!confirmAction) return;
    setIsProcessingAction(true);
    const { type, user } = confirmAction;
    
    try {
      if (type === 'block') {
        const isBlocked = user.subscriptionStatus === 'BLOCKED';
        await supabase.from('profiles').update({ 
            subscription_status: isBlocked ? 'ACTIVE' : 'BLOCKED' 
        }).eq('id', user.id);
      } else {
        const isAdmin = user.role === 'ADMIN';
        await supabase.from('profiles').update({ 
            role: isAdmin ? 'USER' : 'ADMIN' 
        }).eq('id', user.id);
      }
      setConfirmAction(null);
    } catch (e) {
      alert("Erro: " + e);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const formatMoney = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString('pt-BR') : '-';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* --- Modais Globais --- */}
      <EditUserModal 
        isOpen={!!userToEdit} 
        user={userToEdit} 
        onClose={() => setUserToEdit(null)} 
        onSave={handleSaveUser} 
      />
      
      <ConfirmationModal 
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={executeAction}
        isLoading={isProcessingAction}
        title={confirmAction?.type === 'block' 
          ? (confirmAction.user.subscriptionStatus === 'BLOCKED' ? 'Desbloquear Usuário' : 'Bloquear Usuário')
          : (confirmAction?.user.role === 'ADMIN' ? 'Remover Admin' : 'Tornar Admin')
        }
        description={confirmAction?.type === 'block'
          ? `Tem certeza que deseja ${confirmAction.user.subscriptionStatus === 'BLOCKED' ? 'liberar' : 'bloquear'} o acesso de ${confirmAction.user.name}? O usuário perderá acesso imediato à plataforma.`
          : `Ao tornar ${confirmAction?.user.name} um Administrador, ele terá acesso total a este painel e dados sensíveis.`
        }
        confirmText={confirmAction?.type === 'block' ? (confirmAction.user.subscriptionStatus === 'BLOCKED' ? 'Desbloquear' : 'Bloquear') : 'Confirmar'}
        confirmColor={confirmAction?.type === 'block' && confirmAction.user.subscriptionStatus !== 'BLOCKED' ? 'red' : 'indigo'}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            Base de Usuários
            <span className="text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800">
              {users.length} total
            </span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie acessos e visualize a performance financeira.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-lg mb-6 flex items-center gap-3">
           <AlertTriangle size={20} />
           {error}
        </div>
      )}
      
      {/* Container Principal */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
        {loading ? (
           <div className="p-12 text-center text-gray-500 animate-pulse">Carregando usuários...</div>
        ) : users.length === 0 ? (
           <div className="p-12 text-center text-gray-500">Nenhum usuário encontrado.</div>
        ) : (
          <>
            {/* --- Desktop View (Tabela) --- */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-zinc-800/50 text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-4 pl-6">Usuário</th>
                    <th className="p-4">Plano</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Função</th>
                    <th className="p-4">Cadastro</th>
                    <th className="p-4 text-right pr-6">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {users.map(user => (
                    <tr 
                      key={user.id} 
                      onClick={() => handleOpenUser(user)}
                      className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    >
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold overflow-hidden border border-gray-100 dark:border-zinc-700">
                            {user.photoUrl ? <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" /> : (user.name?.[0] || 'U')}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">{user.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4"><StatusBadge status={user.plan || 'FREE'} type="plan"/></td>
                      <td className="p-4"><StatusBadge status={user.subscriptionStatus || 'UNKNOWN'} /></td>
                      <td className="p-4"><StatusBadge status={user.role || 'USER'} type="role" /></td>
                      <td className="p-4 text-sm text-gray-500 dark:text-gray-400 font-mono">{formatDate(user.createdAt)}</td>
                      <td className="p-4 pr-6 text-right">
                        <div className="inline-flex p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all cursor-pointer">
                          <Eye size={18} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* --- Mobile View (Cards) --- */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-zinc-800">
              {users.map(user => (
                <div 
                  key={user.id} 
                  onClick={() => handleOpenUser(user)}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/30 active:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold overflow-hidden border border-gray-100 dark:border-zinc-700">
                         {user.photoUrl ? <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" /> : (user.name?.[0] || 'U')}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{user.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
                      </div>
                    </div>
                    <div className="text-gray-400 p-1"><MoreVertical size={20} /></div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <StatusBadge status={user.plan || 'FREE'} type="plan"/>
                    <StatusBadge status={user.subscriptionStatus || 'UNKNOWN'} />
                    {user.role === 'ADMIN' && <StatusBadge status="ADMIN" type="role" />}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* --- MODAL DETALHES (Mobile Friendly) --- */}
      {isDetailModalOpen && selectedUser && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setIsDetailModalOpen(false); }}
        >
           {/* Modal Container */}
           <div className="bg-white dark:bg-zinc-900 w-full h-full md:h-auto md:max-h-[90vh] md:max-w-3xl rounded-none md:rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-zinc-800">
              
              {/* Header */}
              <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900 shrink-0">
                 <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Detalhes</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">UID: {selectedUser.id.substring(0,8)}...</p>
                 </div>
                 <button onClick={() => setIsDetailModalOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full cursor-pointer transition-colors">
                   <X size={24} />
                 </button>
              </div>

              {/* Corpo com Scroll */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                 
                 {/* Perfil */}
                 <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                    <div className="h-24 w-24 shrink-0 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-3xl font-bold overflow-hidden border-4 border-white dark:border-zinc-800 shadow-sm">
                       {selectedUser.photoUrl ? <img src={selectedUser.photoUrl} alt={selectedUser.name} className="h-full w-full object-cover" /> : (selectedUser.name?.[0] || 'U')}
                    </div>
                    <div className="flex-1 space-y-1">
                       <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedUser.name}</h3>
                       <p className="text-gray-500 dark:text-gray-400">{selectedUser.email}</p>
                       <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                          <StatusBadge status={selectedUser.plan || 'FREE'} type="plan"/>
                          <StatusBadge status={selectedUser.role || 'USER'} type="role"/>
                       </div>
                    </div>
                 </div>

                 {/* Stats */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                       <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Receitas</p>
                       <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">{formatMoney(userStats.income)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                       <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">Despesas</p>
                       <p className="text-xl font-bold text-red-900 dark:text-red-100 mt-1">{formatMoney(userStats.expense)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                       <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Saldo Líquido</p>
                       <p className="text-xl font-bold text-blue-900 dark:text-blue-100 mt-1">{formatMoney(userStats.income - userStats.expense)}</p>
                    </div>
                 </div>

                 {/* Frota */}
                 <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                       <Car size={18} className="text-gray-400"/>
                       Frota ({userVehicles.length})
                    </h4>
                    {loadingDetails ? (
                       <div className="h-20 bg-gray-50 dark:bg-zinc-800 rounded-lg animate-pulse"></div>
                    ) : userVehicles.length > 0 ? (
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {userVehicles.map(v => (
                             <div key={v.id} className="p-3 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/50 flex items-center justify-between">
                                <div>
                                   <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{v.brand} {v.model}</p>
                                   <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{v.licensePlate || v.plate || 'Sem placa'}</p>
                                </div>
                                <span className="text-xs font-mono bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-zinc-600 px-2 py-1 rounded">
                                   {v.currentOdometer || 0} km
                                </span>
                             </div>
                          ))}
                       </div>
                    ) : (
                       <div className="p-4 text-center border border-dashed border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-400">Nenhum veículo cadastrado.</div>
                    )}
                 </div>

                 {/* Zona de Perigo (Ações) */}
                 <div className="pt-6 border-t border-gray-100 dark:border-zinc-800">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Zona de Perigo</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                       <button 
                          onClick={handleEditClick}
                          className="flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer transition-all text-sm font-medium"
                       >
                          <Edit size={16} />
                          Editar
                       </button>
                       
                       <button 
                          onClick={() => handleActionClick('role')}
                          className="flex items-center justify-center gap-2 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 cursor-pointer transition-all text-sm font-medium"
                       >
                          <Shield size={16} />
                          {selectedUser.role === 'ADMIN' ? 'Remover Admin' : 'Admin'}
                       </button>

                       <button 
                          onClick={() => handleActionClick('block')}
                          className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-sm font-medium ${
                             selectedUser.subscriptionStatus === 'BLOCKED'
                             ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                             : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                          }`}
                       >
                          {selectedUser.subscriptionStatus === 'BLOCKED' ? <Check size={16} /> : <Ban size={16} />}
                          {selectedUser.subscriptionStatus === 'BLOCKED' ? 'Desbloquear' : 'Bloquear'}
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}