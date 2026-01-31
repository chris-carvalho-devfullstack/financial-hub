// app/routes/admin.users.tsx

import { useState, useEffect } from "react";
import { Eye, Ban, Trash2, X, Car, AlertTriangle } from "lucide-react";
import { 
  collection, 
  query, 
  // orderBy, <--- REMOVIDO TEMPORARIAMENTE
  onSnapshot, 
  where, 
  getDocs,
  doc,
  updateDoc
} from "firebase/firestore";
import { db } from "~/lib/firebase.client";
import type { UserProfile, Vehicle, Transaction } from "~/types/models";

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // <--- Estado de erro
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userVehicles, setUserVehicles] = useState<Vehicle[]>([]);
  const [userStats, setUserStats] = useState({ income: 0, expense: 0 });
  const [loadingDetails, setLoadingDetails] = useState(false);

  // 1. LISTENER REAL (Simplificado para debug)
  useEffect(() => {
    // REMOVIDO 'orderBy("createdAt")' para garantir que usuários antigos apareçam
    const q = query(collection(db, "users"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        // Garante que campos opcionais existam para não quebrar a UI
        const d = doc.data();
        return {
          uid: doc.id,
          email: d.email || 'Sem email',
          name: d.name || 'Anônimo',
          plan: d.plan || 'FREE',
          subscriptionStatus: d.subscriptionStatus || 'UNKNOWN',
          createdAt: d.createdAt, // Pode ser undefined
          canceledAt: d.canceledAt,
          ...d
        };
      }) as UserProfile[];
      
      console.log("Usuários carregados:", data.length); // Debug no Console do navegador
      setUsers(data);
      setLoading(false);
    }, (err) => {
      console.error("Erro de Permissão ou Rede:", err);
      // Mostra o erro na tela para você saber o que é
      setError(err.message.includes("permission") 
        ? "Erro de Permissão: Verifique se seu UID está nas Regras do Firestore." 
        : "Erro ao buscar dados: " + err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenUser = async (user: UserProfile) => {
    setSelectedUser(user);
    setIsModalOpen(true);
    setLoadingDetails(true);
    setUserVehicles([]);
    setUserStats({ income: 0, expense: 0 });

    try {
      // Busca Veículos
      const vQuery = query(collection(db, "vehicles"), where("userId", "==", user.uid));
      const vSnap = await getDocs(vQuery);
      const vehicles = vSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Vehicle[];
      setUserVehicles(vehicles);

      // Busca Transações
      const tQuery = query(collection(db, "transactions"), where("userId", "==", user.uid));
      const tSnap = await getDocs(tQuery);
      
      let totalIncome = 0;
      let totalExpense = 0;

      tSnap.docs.forEach(d => {
        const t = d.data() as Transaction;
        const val = t.amount || 0;
        if (t.type === 'INCOME') totalIncome += val;
        else totalExpense += val;
      });

      setUserStats({ income: totalIncome, expense: totalExpense });
    } catch (error) {
      console.error("Erro detalhes:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedUser) return;
    if (window.confirm("Bloquear usuário?")) {
        await updateDoc(doc(db, "users", selectedUser.uid), { subscriptionStatus: 'BLOCKED' });
        setIsModalOpen(false);
    }
  };

  const formatMoney = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Base de Usuários 
        <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {users.length}
        </span>
      </h1>

      {/* Alerta de Erro na Tela */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2">
            <AlertTriangle />
            {error}
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
            <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
                Nenhum usuário encontrado. <br/>
                <span className="text-sm">Se você tem dados no Firestore, verifique as Regras de Segurança.</span>
            </div>
        ) : (
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-600 text-sm">
            <tr>
              <th className="p-4">Usuário</th>
              <th className="p-4">Plano</th>
              <th className="p-4">Status</th>
              <th className="p-4">Data</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(user => (
              <tr key={user.uid} className="hover:bg-gray-50">
                <td className="p-4">
                  <div className="font-medium text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                  <div className="text-[10px] text-gray-300 font-mono">{user.uid}</div>
                </td>
                <td className="p-4">
                   <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">{user.plan}</span>
                </td>
                <td className="p-4">
                   <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">{user.subscriptionStatus}</span>
                </td>
                <td className="p-4 text-sm text-gray-500">
                    {/* Fallback visual para quem não tem data */}
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => handleOpenUser(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      {/* ... (MANTENHA O CÓDIGO DO MODAL IGUAL AO ANTERIOR) ... */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           {/* ... Copie o conteúdo do modal do arquivo anterior, não mudou ... */}
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{selectedUser.name}</h2>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={24} /></button>
              </div>

              <div className="p-8 space-y-8">
                  {/* Seção 1: Financeiro */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <p className="text-sm text-emerald-600 font-bold mb-1">Ganhos</p>
                        <p className="text-2xl font-bold text-emerald-900">{formatMoney(userStats.income)}</p>
                     </div>
                     <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <p className="text-sm text-red-600 font-bold mb-1">Despesas</p>
                        <p className="text-2xl font-bold text-red-900">{formatMoney(userStats.expense)}</p>
                     </div>
                     <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <p className="text-sm text-blue-600 font-bold mb-1">Líquido</p>
                        <p className="text-2xl font-bold text-blue-900">{formatMoney(userStats.income - userStats.expense)}</p>
                     </div>
                  </div>

                  {/* Seção 2: Frota */}
                  <div>
                      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Car size={20}/> Frota ({userVehicles.length})</h3>
                      {loadingDetails ? <p>Carregando...</p> : userVehicles.map(v => (
                          <div key={v.id} className="border p-3 rounded mb-2 bg-gray-50">
                              <span className="font-bold">{v.brand} {v.model}</span> - {v.currentOdometer}km
                          </div>
                      ))}
                  </div>

                  {/* Seção 3: Danger */}
                  <div className="pt-6 border-t mt-4">
                      <button onClick={handleBlockUser} className="text-red-600 border border-red-200 px-4 py-2 rounded flex items-center gap-2 hover:bg-red-50">
                          <Ban size={16}/> Bloquear Acesso
                      </button>
                  </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}