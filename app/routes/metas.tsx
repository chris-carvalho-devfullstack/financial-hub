// app/routes/metas.tsx

import { useEffect, useState } from "react";
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, getDocs, orderBy, increment } from "firebase/firestore";
import { 
  Target, Plus, Trash2, Trophy, Rocket, Calendar, 
  TrendingUp, CheckCircle2, Car, Filter, Check, AlertTriangle, 
  DollarSign, X, History, Pencil, Wallet, ArrowRight, Info
} from "lucide-react";
import { db, auth } from "~/lib/firebase.client";
import { Platform } from "~/types/enums";
import type { Goal, Vehicle } from "~/types/models";

// === CSS UTILITÁRIO ===
const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

// === COMPONENTES DE MODAL ===

function FeedbackModal({ isOpen, onClose, type, title, message }: any) {
  if (!isOpen) return null;
  const isSuccess = type === 'success';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`bg-gray-900 border ${isSuccess ? 'border-emerald-500/30' : 'border-red-500/30'} rounded-2xl p-6 max-w-sm w-full shadow-2xl transform scale-100 transition-all`}>
        <div className="flex flex-col items-center text-center">
          <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 ${isSuccess ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
            {isSuccess ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-400 mb-6 text-sm">{message}</p>
          <button onClick={onClose} className={`w-full font-bold py-3 rounded-xl transition-colors ${isSuccess ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}>
            {isSuccess ? 'Continuar' : 'Fechar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="bg-red-500/10 p-3 rounded-full">
            <Trash2 className="text-red-500" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-gray-400 text-sm mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg font-medium transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg font-medium transition-colors">Sim, excluir</button>
        </div>
      </div>
    </div>
  );
}

function InputModal({ isOpen, onClose, onConfirm, title }: any) {
  const [value, setValue] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!value) return;
    onConfirm(Number(value));
    setValue("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
         <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
         <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
               <DollarSign size={20} className="text-emerald-500"/> {title}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-lg">R$</span>
                <input
                    type="number" autoFocus required step="0.01" min="0"
                    value={value} onChange={e => setValue(e.target.value)}
                    className={`w-full bg-gray-800 border border-gray-600 rounded-xl py-4 pl-12 pr-4 text-white text-xl font-bold outline-none focus:border-emerald-500 placeholder-gray-600 ${noSpinnerClass}`}
                    placeholder="0.00"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => { setValue(""); onClose(); }} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-colors">Adicionar</button>
              </div>
            </form>
         </div>
      </div>
    </div>
  );
}

// === MODAL DE DETALHES (Extrato Completo) ===
function GoalDetailsModal({ isOpen, onClose, goal, vehicles, onDelete, onEdit }: any) {
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (!isOpen || !goal) return;
        
        const fetchHistory = async () => {
            setLoadingHistory(true);
            try {
                // Busca TODAS as transações vinculadas (Seja INCOME de corrida ou DEPOSIT manual)
                const q = query(
                    collection(db, "transactions"),
                    where("linkedGoalId", "==", goal.id),
                    orderBy("date", "desc")
                );
                const snap = await getDocs(q);
                
                // Mapeia transações
                const linkedTransactions: any[] = snap.docs.map(d => ({ 
                    id: d.id, 
                    ...d.data(), 
                    source: d.data().type === 'INCOME' ? 'TRANSACTION' : 'MANUAL' // Diferencia origem
                }));
                
                // Calcula se existe saldo "legado" (antes de começarmos a registrar transações manuais)
                const totalTracked = linkedTransactions.reduce((acc, curr: any) => acc + (curr.amount / 100), 0);
                const legacyAmount = goal.currentAmount - totalTracked;
                
                const finalHistory: any[] = [...linkedTransactions];
                
                // Adiciona entrada de legado se houver discrepância significativa (> 10 centavos)
                if (legacyAmount > 0.10) {
                    finalHistory.push({
                        id: 'legacy-entry',
                        amount: legacyAmount * 100, 
                        description: 'Saldo Anterior / Inicial',
                        date: goal.createdAt, 
                        source: 'LEGACY'
                    });
                }

                setHistory(finalHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            } catch (error) {
                console.error("Erro ao buscar histórico", error);
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchHistory();
    }, [isOpen, goal]);

    if (!isOpen || !goal) return null;

    const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
    const linkedCarNames = vehicles.filter((v: any) => goal.linkedVehicleIds?.includes(v.id)).map((v: any) => v.name);
    const formatVal = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-800 relative">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors text-white"><X size={20}/></button>
                    
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-3 rounded-2xl ${goal.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-purple-500/20 text-purple-400'}`}>
                            {goal.status === 'COMPLETED' ? <Trophy size={24}/> : <Target size={24}/>}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white leading-none">{goal.title}</h2>
                            <span className="text-sm text-gray-500 font-medium">{goal.purpose}</span>
                        </div>
                    </div>

                    {/* Tags de Veículos no Modal */}
                    <div className="flex flex-wrap gap-2 mt-3">
                        {linkedCarNames.length > 0 ? (
                            linkedCarNames.map((name: string) => (
                                <span key={name} className="bg-blue-900/20 text-blue-400 border border-blue-500/20 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                    <Car size={10}/> {name}
                                </span>
                            ))
                        ) : (
                            <span className="bg-gray-800 text-gray-400 border border-gray-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                Geral
                            </span>
                        )}
                    </div>
                </div>

                {/* Body - Stats & Extrato */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    
                    {/* Card Principal de Progresso */}
                    <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Progresso Atual</span>
                            <span className={`text-lg font-bold ${goal.status === 'COMPLETED' ? 'text-emerald-400' : 'text-white'}`}>{progress.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-4 mb-4 overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-1000 ${goal.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-purple-600'}`} style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex flex-col">
                                <span className="text-gray-500 text-xs">Alcançado</span>
                                <span className="text-emerald-400 font-bold text-xl">{formatVal(goal.currentAmount)}</span>
                            </div>
                            <div className="h-8 w-px bg-gray-700"></div>
                            <div className="flex flex-col items-end">
                                <span className="text-gray-500 text-xs">Meta</span>
                                <span className="text-white font-bold text-xl">{formatVal(goal.targetAmount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Descrição */}
                    {goal.description && (
                        <div className="bg-gray-900 rounded-xl p-4 border border-dashed border-gray-800">
                             <p className="text-gray-400 text-sm italic">"{goal.description}"</p>
                        </div>
                    )}

                    {/* Extrato / Histórico */}
                    <div>
                        <h3 className="text-white font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <History size={16} className="text-gray-500"/> Histórico de Aportes
                        </h3>
                        
                        {loadingHistory ? (
                            <div className="py-8 text-center text-gray-500 animate-pulse text-sm">Carregando movimentações...</div>
                        ) : history.length === 0 ? (
                            <div className="py-8 text-center bg-gray-800/30 rounded-xl border border-gray-800 text-gray-500 text-sm">
                                Nenhum aporte registrado ainda.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {history.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-800/40 rounded-xl border border-gray-800/50 hover:bg-gray-800 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${item.source === 'TRANSACTION' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                {item.source === 'TRANSACTION' ? <TrendingUp size={16}/> : <Wallet size={16}/>}
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-sm">
                                                    {item.source === 'TRANSACTION' ? 'Lucro de Corrida' : (item.description || 'Aporte Manual')}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(item.date).toLocaleDateString('pt-BR')} 
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-emerald-400 font-bold text-sm">
                                            +{formatVal(item.amount / 100)} 
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-800 bg-gray-900 flex gap-3">
                    <button 
                        onClick={() => { onClose(); onEdit(goal); }}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 border border-gray-700"
                    >
                        <Pencil size={18}/> Editar
                    </button>
                    <button 
                        onClick={() => { onClose(); onDelete(goal.id); }}
                        className="flex-1 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <Trash2 size={18}/> Excluir
                    </button>
                </div>
            </div>
        </div>
    );
}


// === PÁGINA PRINCIPAL ===

export default function MetasPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estados de UI
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);
  const [goalToDeleteId, setGoalToDeleteId] = useState<string | null>(null);
  const [goalToAddAmount, setGoalToAddAmount] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null); 
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null); 

  // Filtro
  const [filterVehicleId, setFilterVehicleId] = useState<string>("ALL");

  // Form States
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState(""); 
  const [purpose, setPurpose] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const qVehicles = query(collection(db, "vehicles"), where("userId", "==", user.uid));
        onSnapshot(qVehicles, (snap) => setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Vehicle[]));

        const qGoals = query(collection(db, "goals"), where("userId", "==", user.uid));
        const unsubscribeSnapshot = onSnapshot(qGoals, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Goal[];
          setGoals(data.sort((a, b) => (a.status === 'COMPLETED' ? 1 : -1)));
          setLoading(false);
        });
        return () => unsubscribeSnapshot();
      } else setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  const toggleVehicleSelection = (id: string) => {
    setSelectedVehicleIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const handleEditInit = (goal: Goal) => {
      setEditingGoal(goal);
      setTitle(goal.title);
      setDescription(goal.description || "");
      setTargetAmount(String(goal.targetAmount));
      setCurrentAmount(String(goal.currentAmount));
      setPurpose(goal.purpose || "");
      setDeadline(goal.deadline || "");
      setSelectedVehicleIds(goal.linkedVehicleIds || []);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
      setEditingGoal(null);
      resetForm();
  };

  const resetForm = () => {
      setTitle(""); setDescription(""); setTargetAmount(""); setCurrentAmount("");
      setPurpose(""); setDeadline(""); setSelectedVehicleIds([]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsSaving(true);

    try {
      const initialCurrent = Number(currentAmount) || 0;
      const target = Number(targetAmount);
      
      const goalData: any = {
        userId: auth.currentUser.uid,
        linkedVehicleIds: selectedVehicleIds, 
        title,
        description,
        targetAmount: target,
        currentAmount: initialCurrent,
        purpose,
        deadline,
        status: initialCurrent >= target ? 'COMPLETED' : 'ACTIVE',
        updatedAt: new Date().toISOString()
      };

      if (!editingGoal) {
          goalData.createdAt = new Date().toISOString();
          await addDoc(collection(db, "goals"), goalData);
          setFeedback({ type: 'success', title: 'Meta Criada!', message: 'Seu objetivo foi criado com sucesso. 🚀' });
      } else {
          await updateDoc(doc(db, "goals", editingGoal.id), goalData);
          setFeedback({ type: 'success', title: 'Meta Atualizada!', message: 'As alterações foram salvas.' });
          setEditingGoal(null);
      }
      
      resetForm();
      setIsSaving(false);

    } catch (error: any) {
      setIsSaving(false);
      setFeedback({ type: 'error', title: 'Erro', message: error.message });
    }
  };

  const handleDeleteConfirm = async () => {
    if (goalToDeleteId) {
      await deleteDoc(doc(db, "goals", goalToDeleteId));
      setGoalToDeleteId(null);
    }
  };

  // Função Auxiliar para registrar transação de aporte manual
  const registerDeposit = async (goal: Goal, amountVal: number) => {
      if (!auth.currentUser) return;
      
      // Cria registro de transação do tipo DEPOSIT (para histórico)
      // Usamos um modelo compatível com Transaction, mas com campos específicos
      await addDoc(collection(db, "transactions"), {
          userId: auth.currentUser.uid,
          vehicleId: null, // Aporte manual na meta não precisa estar atrelado a veículo na transação
          linkedGoalId: goal.id,
          amount: Math.round(amountVal * 100), // Salva em centavos
          date: new Date().toISOString(),
          type: 'DEPOSIT', // Novo tipo implícito ou usar INCOME com flag
          description: 'Aporte Manual',
          platform: Platform.PARTICULAR, // Placeholder para satisfazer tipagem se necessário
          createdAt: new Date().toISOString()
      });

      // Atualiza saldo da meta
      const newCurrent = goal.currentAmount + amountVal;
      const newStatus = newCurrent >= goal.targetAmount ? 'COMPLETED' : 'ACTIVE';
      await updateDoc(doc(db, "goals", goal.id), { 
          currentAmount: newCurrent, 
          status: newStatus 
      });
  };

  const handleManualAdd = async (val: number) => {
      if (goalToAddAmount && val > 0) {
          try {
              await registerDeposit(goalToAddAmount, val);
              setGoalToAddAmount(null);
              setFeedback({ type: 'success', title: 'Aporte Realizado!', message: `R$ ${val.toLocaleString('pt-BR')} adicionados à meta.` });
          } catch (error: any) {
              setFeedback({ type: 'error', title: 'Erro', message: error.message });
          }
      }
  };

  const handleQuickAdd = async (goal: Goal, val: number) => {
      try {
          await registerDeposit(goal, val);
          setFeedback({ type: 'success', title: 'Aporte Realizado!', message: `R$ ${val.toLocaleString('pt-BR')} adicionados.` });
      } catch (error: any) {
          setFeedback({ type: 'error', title: 'Erro', message: error.message });
      }
  };

  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const getProgress = (current: number, target: number) => Math.min(100, (current / target) * 100);

  const displayedGoals = goals.filter(g => {
    if (filterVehicleId === "ALL") return true;
    if (filterVehicleId === "NONE") return !g.linkedVehicleIds || g.linkedVehicleIds.length === 0;
    return g.linkedVehicleIds?.includes(filterVehicleId);
  });

  return (
    <div className="pb-20 animate-fade-in max-w-7xl mx-auto px-4">
      
      {/* MODAIS GLOBAIS */}
      <FeedbackModal isOpen={!!feedback} onClose={() => setFeedback(null)} type={feedback?.type} title={feedback?.title} message={feedback?.message} />
      <ConfirmModal isOpen={!!goalToDeleteId} onClose={() => setGoalToDeleteId(null)} onConfirm={handleDeleteConfirm} title="Excluir Meta?" message="Isso apagará todo o histórico deste objetivo." />
      <InputModal isOpen={!!goalToAddAmount} onClose={() => setGoalToAddAmount(null)} onConfirm={handleManualAdd} title="Adicionar Aporte Manual" />
      
      <GoalDetailsModal 
        isOpen={!!selectedGoal} 
        onClose={() => setSelectedGoal(null)} 
        goal={selectedGoal} 
        vehicles={vehicles}
        onDelete={(id: string) => setGoalToDeleteId(id)}
        onEdit={handleEditInit}
      />

      <header className="mb-8 mt-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Rocket className="text-purple-500" /> Metas & Objetivos
          </h1>
          <p className="text-gray-400 mt-1">Defina seus sonhos e acompanhe seu progresso.</p>
        </div>
        
        <div className="bg-gray-900 border border-gray-800 p-1.5 rounded-xl flex items-center gap-2">
           <Filter size={16} className="text-gray-500 ml-2"/>
           <select value={filterVehicleId} onChange={e => setFilterVehicleId(e.target.value)} className="bg-transparent text-sm text-white font-medium outline-none p-1 cursor-pointer">
              <option value="ALL" className="bg-gray-900">Todas as Metas</option>
              <option value="NONE" className="bg-gray-900">Gerais (Sem veículo)</option>
              {vehicles.map(v => <option key={v.id} value={v.id} className="bg-gray-900">{v.name}</option>)}
           </select>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORMULÁRIO */}
        <div className="lg:col-span-1">
          <div className={`p-6 rounded-2xl border sticky top-4 shadow-xl transition-colors ${editingGoal ? 'bg-purple-900/10 border-purple-500/30' : 'bg-gray-900 border-gray-800'}`}>
            <h2 className={`text-xl font-semibold mb-5 flex items-center gap-2 ${editingGoal ? 'text-purple-400' : 'text-emerald-500'}`}>
              {editingGoal ? <Pencil size={20}/> : <Plus size={20} />} 
              {editingGoal ? 'Editar Meta' : 'Nova Meta'}
            </h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              
              {/* SELEÇÃO DE VEÍCULOS */}
              <div>
                <label className="block text-xs uppercase font-bold text-gray-500 mb-2">Vincular a Veículos (Opcional)</label>
                <div className="flex flex-wrap gap-2">
                  {vehicles.map(v => {
                    const isSelected = selectedVehicleIds.includes(v.id);
                    return (
                      <button key={v.id} type="button" onClick={() => toggleVehicleSelection(v.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${isSelected ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>
                         {isSelected && <Check size={12} />} {v.name}
                      </button>
                    )
                  })}
                </div>
                {selectedVehicleIds.length === 0 && (
                    <div className="flex items-center gap-1 mt-2 text-gray-500 text-xs italic">
                        <Info size={12} /> Nenhum selecionado (Meta Geral)
                    </div>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Título</label>
                <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none" placeholder="Ex: Troca de Pneus" />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Finalidade</label>
                <select required value={purpose} onChange={e => setPurpose(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none">
                  <option value="">Selecione...</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Aposentadoria">Aposentadoria</option>
                  <option value="Veiculo">Troca de Veículo</option>
                  <option value="Documentos">IPVA / Docs</option>
                  <option value="Reserva">Reserva de Emergência</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Alvo (R$)</label>
                  <input type="number" required value={targetAmount} onChange={e => setTargetAmount(e.target.value)} className={`w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-emerald-400 font-bold outline-none ${noSpinnerClass}`} placeholder="0.00" />
                </div>
                <div>
                   <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Atual (R$)</label>
                   <input type="number" value={currentAmount} onChange={e => setCurrentAmount(e.target.value)} className={`w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none ${noSpinnerClass}`} placeholder="Opcional" />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-gray-500 mb-1">Data Limite</label>
                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none" />
              </div>

              <div className="flex gap-2">
                  {editingGoal && (
                      <button type="button" onClick={handleCancelEdit} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3.5 rounded-xl mt-2 transition-all">
                          Cancelar
                      </button>
                  )}
                  <button type="submit" disabled={isSaving} className={`flex-1 bg-gradient-to-r ${editingGoal ? 'from-purple-600 to-indigo-600' : 'from-emerald-600 to-teal-600'} hover:opacity-90 text-white font-bold py-3.5 rounded-xl mt-2 transition-all shadow-lg flex justify-center gap-2`}>
                    {isSaving ? "Salvando..." : editingGoal ? "Atualizar Meta" : "Traçar Meta"}
                  </button>
              </div>
            </form>
          </div>
        </div>

        {/* LISTA DE METAS */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <p className="text-gray-500 animate-pulse text-center mt-10">Buscando seus sonhos...</p>
          ) : displayedGoals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800 border-dashed">
              <Trophy className="text-gray-700 mb-4 h-16 w-16" />
              <h3 className="text-xl font-bold text-gray-400">Nenhuma meta encontrada</h3>
            </div>
          ) : (
            displayedGoals.map((goal) => {
              const progress = getProgress(goal.currentAmount, goal.targetAmount);
              const isCompleted = goal.status === 'COMPLETED';
              const linkedCarNames = vehicles
                  .filter(v => goal.linkedVehicleIds?.includes(v.id))
                  .map(v => v.name);
              
              return (
                <div 
                    key={goal.id} 
                    onClick={() => setSelectedGoal(goal)} 
                    className={`relative bg-gray-900 rounded-2xl border p-6 transition-all group hover:border-gray-500 cursor-pointer ${isCompleted ? 'border-emerald-500/30 bg-emerald-900/5' : 'border-gray-800'}`}
                >
                  {isCompleted && <div className="absolute inset-0 bg-emerald-500/5 blur-xl rounded-2xl -z-10"></div>}

                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4 items-center">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${isCompleted ? 'bg-emerald-500 text-white shadow-emerald-900/20' : 'bg-gray-800 text-purple-400 shadow-purple-900/10'}`}>
                          {isCompleted ? <Trophy size={28} /> : <Target size={28} />}
                       </div>
                       <div>
                          <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors flex items-center gap-2">
                              {goal.title}
                              <ArrowRight size={16} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all text-purple-500"/>
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs mt-1 text-gray-500">
                             <span className="uppercase tracking-wider font-bold">{goal.purpose}</span>
                             {goal.deadline && (
                               <span className="flex items-center gap-1 border-l border-gray-700 pl-2">
                                 <Calendar size={12}/> {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                               </span>
                             )}
                          </div>
                          
                          {/* Tags de Veículos no Card */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {linkedCarNames.length > 0 ? (
                                linkedCarNames.map((name, idx) => (
                                    <span key={idx} className="bg-blue-900/20 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold flex items-center gap-1">
                                        <Car size={10}/> {name}
                                    </span>
                                ))
                            ) : (
                                <span className="text-gray-600 text-[10px] bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">Geral</span>
                            )}
                          </div>
                       </div>
                    </div>
                  </div>
                  
                  {/* Descrição Visível no Card */}
                  {goal.description && (
                      <p className="text-gray-400 text-sm mb-4 leading-relaxed line-clamp-2">{goal.description}</p>
                  )}
                  
                  {/* Visualização de Progresso */}
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 mb-2">
                      <div className="flex justify-between items-end mb-2">
                          <div className="flex flex-col">
                             <span className="text-[10px] uppercase text-gray-500 font-bold mb-1">Alcançado</span>
                             <span className={`text-2xl font-bold ${isCompleted ? 'text-emerald-400' : 'text-white'}`}>
                                 {formatMoney(goal.currentAmount)}
                             </span>
                          </div>
                          <div className="flex flex-col items-end">
                             <span className="text-[10px] uppercase text-gray-500 font-bold mb-1">Meta</span>
                             <span className="text-lg font-medium text-gray-400">
                                 {formatMoney(goal.targetAmount)}
                             </span>
                          </div>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-purple-600'}`} style={{ width: `${progress}%` }}></div>
                      </div>
                  </div>

                  {/* Barra de Ações Rápidas (Restaurada e Integrada ao Histórico) */}
                  {!isCompleted && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
                        <p className="text-[10px] text-gray-500 self-center mr-auto uppercase font-bold hidden sm:block">Aportar:</p>
                        {[50, 100, 500].map(val => (
                            <button 
                                key={val} 
                                onClick={(e) => { e.stopPropagation(); handleQuickAdd(goal, val); }} 
                                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-emerald-600 hover:text-white text-emerald-500 text-xs font-bold border border-gray-700 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                            >
                                <TrendingUp size={12}/> +{val}
                            </button>
                        ))}
                        <button 
                            onClick={(e) => { e.stopPropagation(); setGoalToAddAmount(goal); }} 
                            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold border border-gray-700 transition-all active:scale-95"
                        >
                            Outro
                        </button>
                    </div>
                  )}
                  
                  {isCompleted && (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold justify-center bg-emerald-500/10 rounded-lg py-2 mt-4 border border-emerald-500/20">
                       <CheckCircle2 size={16} /> Meta Conquistada!
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