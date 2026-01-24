// app/routes/metas.tsx

import { useEffect, useState } from "react";
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { 
  Target, Plus, Trash2, Trophy, Rocket, Calendar, 
  TrendingUp, CheckCircle2, AlertCircle, Wallet
} from "lucide-react";
import { db, auth } from "~/lib/firebase.client";
import type { Goal } from "~/types/models";

export default function MetasPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estados do Formulário
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState(""); // Opcional no cadastro inicial
  const [purpose, setPurpose] = useState("");
  const [deadline, setDeadline] = useState("");

  // Monitorar Auth e Buscar Metas
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(
          collection(db, "goals"),
          where("userId", "==", user.uid)
        );

        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Goal[];
          // Ordenar: Completas pro final, resto por data
          setGoals(data.sort((a, b) => (a.status === 'COMPLETED' ? 1 : -1)));
          setLoading(false);
        });
        
        return () => unsubscribeSnapshot();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsSaving(true);

    try {
      const initialCurrent = Number(currentAmount) || 0;
      const target = Number(targetAmount);
      
      const newGoal: Omit<Goal, 'id'> = {
        userId: auth.currentUser.uid,
        title,
        description,
        targetAmount: target,
        currentAmount: initialCurrent,
        purpose,
        deadline,
        createdAt: new Date().toISOString(),
        status: initialCurrent >= target ? 'COMPLETED' : 'ACTIVE'
      };

      await addDoc(collection(db, "goals"), newGoal);
      
      // Resetar Form
      setTitle("");
      setDescription("");
      setTargetAmount("");
      setCurrentAmount("");
      setPurpose("");
      setDeadline("");
      setIsSaving(false);
      alert("Meta traçada com sucesso! 🚀");
    } catch (error: any) {
      alert("Erro ao salvar: " + error.message);
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Desistir desta meta?")) {
      await deleteDoc(doc(db, "goals", id));
    }
  };

  const handleUpdateProgress = async (goal: Goal, amountToAdd: number) => {
    const newCurrent = goal.currentAmount + amountToAdd;
    const newStatus = newCurrent >= goal.targetAmount ? 'COMPLETED' : 'ACTIVE';
    
    await updateDoc(doc(db, "goals", goal.id), {
      currentAmount: newCurrent,
      status: newStatus
    });
  };

  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const getProgress = (current: number, target: number) => Math.min(100, (current / target) * 100);

  return (
    <div className="pb-20 animate-fade-in">
      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <Rocket className="text-purple-500" /> Metas & Objetivos
        </h1>
        <p className="text-gray-400 mt-1">Defina seus sonhos e acompanhe seu progresso.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* === FORMULÁRIO (COLUNA 1) === */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 sticky top-4 shadow-xl">
            <h2 className="text-xl font-semibold text-emerald-500 mb-5 flex items-center gap-2">
              <Plus size={20} /> Nova Meta
            </h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Título da Meta</label>
                <input required value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none transition-all" 
                  placeholder="Ex: Reserva de Emergência" />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Finalidade Planejada</label>
                <select required value={purpose} onChange={e => setPurpose(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none">
                  <option value="">Selecione...</option>
                  <option value="Aposentadoria">Aposentadoria / Futuro</option>
                  <option value="Veiculo">Troca de Veículo</option>
                  <option value="Viagem">Viagem / Lazer</option>
                  <option value="Dividas">Quitar Dívidas</option>
                  <option value="Reserva">Reserva de Emergência</option>
                  <option value="Outro">Outro Sonho</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Valor Alvo (R$)</label>
                  <input type="number" required value={targetAmount} onChange={e => setTargetAmount(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-emerald-400 font-bold outline-none" 
                    placeholder="0.00" />
                </div>
                <div>
                   <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Já tenho (R$)</label>
                   <input type="number" value={currentAmount} onChange={e => setCurrentAmount(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none" 
                    placeholder="Opcional" />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Data Limite (Opcional)</label>
                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none" />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Descrição</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-300 text-sm outline-none resize-none" 
                  placeholder="Detalhes sobre este objetivo..." />
              </div>

              <button type="submit" disabled={isSaving}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 rounded-xl mt-2 transition-all shadow-lg transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center gap-2">
                {isSaving ? "Criando..." : <><Target size={20}/> Traçar Meta</>}
              </button>
            </form>
          </div>
        </div>

        {/* === LISTA DE METAS (COLUNA 2 & 3) === */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <p className="text-gray-500 animate-pulse text-center mt-10">Buscando seus sonhos...</p>
          ) : goals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800 border-dashed">
              <Trophy className="text-gray-700 mb-4 h-16 w-16" />
              <h3 className="text-xl font-bold text-gray-400">Nenhuma meta definida</h3>
              <p className="text-gray-600 text-sm">Use o formulário para começar seu plano.</p>
            </div>
          ) : (
            goals.map((goal) => {
              const progress = getProgress(goal.currentAmount, goal.targetAmount);
              const isCompleted = goal.status === 'COMPLETED';
              
              return (
                <div key={goal.id} className={`
                  relative bg-gray-900 rounded-2xl border p-6 transition-all group hover:border-gray-600
                  ${isCompleted ? 'border-emerald-500/30 bg-emerald-900/5' : 'border-gray-800'}
                `}>
                  {/* Fundo Glow se completado */}
                  {isCompleted && <div className="absolute inset-0 bg-emerald-500/5 blur-xl rounded-2xl -z-10"></div>}

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-4 items-center">
                       <div className={`
                         w-12 h-12 rounded-full flex items-center justify-center border
                         ${isCompleted ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-gray-800 text-purple-400 border-gray-700'}
                       `}>
                          {isCompleted ? <Trophy size={24} /> : <Target size={24} />}
                       </div>
                       <div>
                          <h3 className={`text-xl font-bold ${isCompleted ? 'text-emerald-400' : 'text-white'}`}>{goal.title}</h3>
                          <div className="flex items-center gap-3 text-xs mt-1">
                             <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded border border-gray-700 uppercase tracking-wider font-bold text-[10px]">
                               {goal.purpose}
                             </span>
                             {goal.deadline && (
                               <span className="flex items-center gap-1 text-gray-500">
                                 <Calendar size={12}/> {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                               </span>
                             )}
                          </div>
                       </div>
                    </div>
                    
                    <button onClick={() => handleDelete(goal.id)} 
                      className="text-gray-600 hover:text-red-500 transition-colors p-2 hover:bg-gray-800 rounded-lg">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  {goal.description && <p className="text-gray-400 text-sm mb-5 leading-relaxed">{goal.description}</p>}

                  {/* Barra de Progresso */}
                  <div className="mb-2 flex justify-between items-end text-sm">
                     <span className="text-gray-400 font-medium">Progresso</span>
                     <div className="text-right">
                        <span className="text-white font-bold text-lg">{formatMoney(goal.currentAmount)}</span>
                        <span className="text-gray-600 text-xs ml-1">de {formatMoney(goal.targetAmount)}</span>
                     </div>
                  </div>
                  
                  <div className="w-full bg-gray-800 rounded-full h-3 mb-6 overflow-hidden border border-gray-700">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out relative
                        ${isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-purple-600'}
                      `}
                      style={{ width: `${progress}%` }}
                    >
                      {/* Efeito Brilho na barra */}
                      <div className="absolute top-0 right-0 bottom-0 w-full bg-gradient-to-l from-white/20 to-transparent"></div>
                    </div>
                  </div>

                  {/* Botões de Ação Rápida (Depositar) */}
                  {!isCompleted && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
                       <p className="text-xs text-gray-500 self-center mr-auto">Adicionar aporte:</p>
                       {[50, 100, 500].map(val => (
                         <button key={val} onClick={() => handleUpdateProgress(goal, val)}
                           className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-emerald-400 text-xs font-bold border border-gray-700 transition-colors flex items-center gap-1">
                           <TrendingUp size={12}/> +{val}
                         </button>
                       ))}
                       <button onClick={() => {
                          const val = prompt("Qual valor deseja adicionar?");
                          if (val) handleUpdateProgress(goal, Number(val));
                       }} className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold border border-gray-700 transition-colors">
                          Outro
                       </button>
                    </div>
                  )}

                  {isCompleted && (
                    <div className="mt-4 pt-3 border-t border-emerald-900/30 flex items-center gap-2 text-emerald-400 text-sm font-bold justify-center bg-emerald-500/5 rounded-lg py-2">
                       <CheckCircle2 size={18} /> Meta Conquistada! Parabéns!
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}