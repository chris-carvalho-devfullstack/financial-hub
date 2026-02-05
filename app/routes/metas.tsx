// app/routes/metas.tsx

import { useEffect, useState, useCallback } from "react";
import { 
  Target, Plus, Trash2, Trophy, Rocket, Calendar, 
  TrendingUp, CheckCircle2, Car, Filter, Check, AlertTriangle, 
  DollarSign, X, History, Pencil, Wallet, ArrowRight, Info, Tag, PiggyBank, HelpCircle
} from "lucide-react";
import { supabase } from "~/lib/supabase.client";
import { Platform } from "~/types/enums";
import type { Goal, Vehicle } from "~/types/models";
import type { User } from "@supabase/supabase-js";

// === CSS UTILITÁRIO ===
const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

// === HELPERS ===
const getTransactionLogos = (transaction: any) => {
  if (!transaction) return [];
  const logos: { src: string; alt: string }[] = [];
  const platformsToCheck: string[] = [];

  if (transaction.platform === 'MULTIPLE' && Array.isArray(transaction.split)) {
      platformsToCheck.push(...transaction.split.map((s: any) => s.platform));
  } else if (transaction.platform) {
      platformsToCheck.push(transaction.platform);
  }

  platformsToCheck.forEach(p => {
      const lower = String(p).toLowerCase();
      if (lower.includes('uber')) {
          logos.push({ src: '/logos/uber.png', alt: 'Uber' });
      } else if (lower.includes('99') || lower.includes('ninety')) {
          logos.push({ src: '/logos/99.png', alt: '99' });
      } else if (lower.includes('indriver') || lower.includes('indrive')) {
          logos.push({ src: '/logos/indriver.png', alt: 'inDriver' });
      } else if (lower.includes('ifood')) {
          logos.push({ src: '/logos/ifood.png', alt: 'iFood' });
      } else if (lower.includes('ze') || lower.includes('delivery')) {
          logos.push({ src: '/logos/ze-delivery.png', alt: 'Zé Delivery' });
      }
  });
  
  return logos;
};

const formatVal = (val: number | undefined | null) => {
    const v = val ?? 0;
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// === COMPONENTES DE MODAL ===
function FeedbackModal({ isOpen, onClose, type, title, message }: any) {
  if (!isOpen) return null;
  const isSuccess = type === 'success';
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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

// Atualizado para aceitar zIndex customizado
function ConfirmModal({ isOpen, onClose, onConfirm, title, message, zIndex = "z-[80]" }: any) {
  if (!isOpen) return null;
  return (
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200`}>
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

// === NOVO MODAL DE APORTE (Com Descrição e Valor) ===
function InputModal({ isOpen, onClose, onConfirm, title, initialValue = 0 }: any) {
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("Aporte Manual");

  useEffect(() => {
    if (isOpen) {
        setValue(initialValue > 0 ? String(initialValue) : "");
        setDescription("Aporte Manual");
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!value) return;
    onConfirm(Number(value), description);
    setValue("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
         <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
         <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
               <PiggyBank size={24} className="text-emerald-500"/> {title}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="text-xs uppercase text-gray-500 font-bold mb-1 block">Valor</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-lg">R$</span>
                    <input type="number" autoFocus required step="0.01" min="0" value={value} onChange={e => setValue(e.target.value)} className={`w-full bg-gray-800 border border-gray-600 rounded-xl py-3 pl-12 pr-4 text-white text-xl font-bold outline-none focus:border-emerald-500 placeholder-gray-600 ${noSpinnerClass}`} placeholder="0.00"/>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase text-gray-500 font-bold mb-1 block">Nome do Lançamento</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"><Tag size={18}/></span>
                    <input type="text" required value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-xl py-3 pl-12 pr-4 text-white font-medium outline-none focus:border-emerald-500 placeholder-gray-600" placeholder="Ex: Economia extra"/>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => { setValue(""); onClose(); }} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-colors">Confirmar</button>
              </div>
            </form>
         </div>
      </div>
    </div>
  );
}

// === MODAL DE EDIÇÃO DE TRANSAÇÃO (Lápis) ===
function EditTransactionModal({ isOpen, onClose, onConfirm, onRemove, transaction }: any) {
    const [value, setValue] = useState("");
    const [showHelp, setShowHelp] = useState(false);
    const [showConfirmRemove, setShowConfirmRemove] = useState(false); // Estado para o modal de confirmação
    
    useEffect(() => {
        if (isOpen && transaction) {
            setValue(transaction.netAmount ? String(transaction.netAmount.toFixed(2)) : "0.00");
            setShowHelp(false);
            setShowConfirmRemove(false);
        }
    }, [isOpen, transaction]);

    if (!isOpen || !transaction) return null;

    const isManual = transaction.source === 'MANUAL';

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!value) return;
        onConfirm(transaction, Number(value));
        onClose();
    };

    return (
        <>
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
                    <div className="flex flex-col gap-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Pencil size={20} className="text-purple-500"/> 
                            {isManual ? 'Editar Aporte Manual' : 'Editar Valor para Meta'}
                        </h3>
                        
                        {!isManual && (
                            <>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold uppercase text-gray-500">Valor Original (Ganho):</span>
                                    <span className="text-sm font-mono text-white bg-gray-800 px-2 py-0.5 rounded">
                                        {formatVal(transaction.grossAmount)}
                                    </span>
                                </div>

                                <button 
                                    onClick={() => setShowHelp(!showHelp)}
                                    className="text-left text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 p-3 rounded-lg border border-blue-500/20 flex items-start gap-2 transition-colors"
                                >
                                    <Info size={16} className="shrink-0 mt-0.5"/>
                                    <div>
                                        <span className="font-bold block mb-1">Quando devo editar isso?</span>
                                        {showHelp ? (
                                            <p className="opacity-90 leading-relaxed">
                                                Use isto quando parte do ganho foi gasta antes de chegar à meta.
                                                <br/><br/>
                                                Ex: Ganhou R$ 50 mas gastou R$ 20. Edite para R$ 30.
                                                O ganho original permanece intacto.
                                            </p>
                                        ) : (
                                            <span className="opacity-70">Clique para ver um exemplo prático.</span>
                                        )}
                                    </div>
                                </button>
                            </>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="relative mt-2">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500 font-bold text-lg">R$</span>
                                <input type="number" autoFocus required step="0.01" min="0" value={value} onChange={e => setValue(e.target.value)} className={`w-full bg-gray-800 border border-gray-600 rounded-xl py-4 pl-12 pr-4 text-white text-xl font-bold outline-none focus:border-purple-500 placeholder-gray-600 ${noSpinnerClass}`} placeholder="0.00"/>
                            </div>
                            
                            <div className="flex flex-col gap-3 mt-6">
                                <div className="flex gap-3">
                                    <button type="button" onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition-colors">Cancelar</button>
                                    <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-bold transition-colors">Salvar</button>
                                </div>

                                {/* BOTÃO DE REMOVER: Agora abre o ConfirmModal */}
                                <button 
                                    type="button" 
                                    onClick={() => setShowConfirmRemove(true)} 
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-bold"
                                >
                                    <Trash2 size={16} /> 
                                    {isManual ? 'Excluir Aporte Manual' : 'Remover este lançamento da Meta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Modal de Confirmação Sobreposto (Z-90) */}
            <ConfirmModal 
                isOpen={showConfirmRemove}
                zIndex="z-[90]"
                title={isManual ? "Excluir Aporte?" : "Remover da Meta?"}
                message={isManual 
                    ? "Tem certeza? Este aporte manual será apagado permanentemente." 
                    : "Tem certeza? Este ganho sairá da meta e voltará para o extrato geral."}
                onClose={() => setShowConfirmRemove(false)}
                onConfirm={() => {
                    onRemove(transaction);
                    onClose(); // Fecha o modal de edição
                }}
            />
        </>
    );
}

function GoalDetailsModal({ isOpen, onClose, goal, vehicles, onDelete, onEdit, onEditTransaction }: any) {
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (!isOpen || !goal) return;
        
        const fetchHistory = async () => {
            setLoadingHistory(true);
            try {
                const { data: linkedTransactions, error } = await supabase
                    .from("transactions")
                    .select("*")
                    .eq("linked_goal_id", goal.id)
                    .order("date", { ascending: false });

                if (error) throw error;

                let fuelHistory: any[] = [];
                if (goal.linkedVehicleIds && goal.linkedVehicleIds.length > 0) {
                    const { data: fuels } = await supabase
                        .from("transactions")
                        .select("vehicle_id, price_per_liter, date")
                        .eq("category", "FUEL")
                        .in("vehicle_id", goal.linkedVehicleIds)
                        .order("date", { ascending: false });
                    if (fuels) fuelHistory = fuels;
                }
                
                const mappedTransactions: any[] = (linkedTransactions || []).map(t => {
                    // Identificando se é manual: Platform é PARTICULAR ou vehicle_id é nulo quando vinculado a meta
                    const isManual = t.platform === 'PARTICULAR' || (!t.vehicle_id && t.linked_goal_id);

                    const grossAmount = (t.amount || 0) / 100;
                    
                    // --- NOVA LÓGICA DE PRIORIDADE ---
                    let netAmount = grossAmount;
                    let isCustomNet = false; // Flag para saber se foi editado manualmente

                    // 1. SE existe um valor personalizado no banco (coluna goal_net_amount), usa ele.
                    if (t.goal_net_amount !== null && t.goal_net_amount !== undefined) {
                        netAmount = t.goal_net_amount / 100;
                        isCustomNet = true;
                    } 
                    // 2. SE NÃO, e for corrida de app com dados de consumo, calcula o custo
                    else if (!isManual && t.distance && t.cluster_km_per_liter && t.cluster_km_per_liter > 0) {
                        const relevantFuel = fuelHistory.find(f => 
                            f.vehicle_id === t.vehicle_id && 
                            new Date(f.date) <= new Date(t.date)
                        );
                        
                        const fuelPrice = relevantFuel?.price_per_liter || fuelHistory.find(f => f.vehicle_id === t.vehicle_id)?.price_per_liter || 0;

                        if (fuelPrice > 0) {
                            const cost = (t.distance / t.cluster_km_per_liter) * fuelPrice;
                            netAmount = grossAmount - cost;
                        }
                    }

                    return { 
                        ...t, 
                        source: isManual ? 'MANUAL' : 'TRANSACTION',
                        netAmount, 
                        grossAmount,
                        isCustomNet // Passamos essa flag adiante para a UI
                    };
                });
                
                const totalTrackedNet = mappedTransactions.reduce((acc, curr) => acc + curr.netAmount, 0);
                const legacyAmount = (goal.currentAmount || 0) - totalTrackedNet;
                
                const finalHistory: any[] = [...mappedTransactions];
                
                if (legacyAmount > 0.10) { 
                    finalHistory.push({
                        id: 'legacy-entry',
                        netAmount: legacyAmount, 
                        grossAmount: legacyAmount,
                        description: 'Saldo Anterior / Inicial',
                        date: goal.createdAt, 
                        source: 'LEGACY',
                        platform: null
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
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
                    {/* Card Principal */}
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

                    {goal.description && (
                        <div className="bg-gray-900 rounded-xl p-4 border border-dashed border-gray-800">
                             <p className="text-gray-400 text-sm italic">"{goal.description}"</p>
                        </div>
                    )}

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
                            <div className="space-y-3">
                                {history.map((item, idx) => {
                                    const logos = getTransactionLogos(item);
                                    const hasDifference = item.grossAmount && (item.grossAmount - item.netAmount) > 0.05;
                                    const isEditable = item.source !== 'LEGACY';
                                    
                                    return (
                                        <div key={idx} className="relative flex items-center justify-between p-4 bg-gray-800/40 rounded-xl border border-gray-800/50 hover:bg-gray-800 transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 flex items-center justify-center rounded-xl overflow-hidden shrink-0 ${item.source === 'TRANSACTION' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                    {item.source === 'TRANSACTION' ? <TrendingUp size={20}/> : <Wallet size={20}/>}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        <p className="text-white font-bold text-sm mr-1">
                                                            {item.source === 'TRANSACTION' ? 'Lucro com Corridas' : (item.description || 'Aporte Manual')}
                                                        </p>
                                                        {logos.length > 0 && logos.map((l: any, idxLogo) => (
                                                            <div key={`${l.alt}-${idxLogo}`} className={`relative z-[${logos.length - idxLogo}] ${idxLogo > 0 ? '-ml-2' : ''}`}>
                                                                    <img src={l.src} alt={l.alt} className="w-5 h-5 object-contain rounded-full bg-gray-800 border border-gray-700" />
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* TAG DE APORTE MANUAL EM MINIATURA */}
                                                    {item.source === 'MANUAL' && (
                                                        <div className="flex items-center gap-1 mt-1 bg-blue-500/10 border border-blue-500/20 rounded px-1.5 py-0.5 w-fit">
                                                            <Wallet size={10} className="text-blue-400"/>
                                                            <span className="text-[10px] font-bold text-blue-300 uppercase">Manual</span>
                                                        </div>
                                                    )}

                                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                                        {item.date ? new Date(item.date).toLocaleDateString('pt-BR') : '-'} 
                                                        {item.source === 'TRANSACTION' && item.id && (
                                                            <span className="bg-gray-800 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-mono border border-gray-700">
                                                                #{item.id.slice(0, 6)}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <span className="text-emerald-400 font-bold text-lg block leading-none flex items-center justify-end gap-1">
                                                        {/* Ícone de Lápis pequeno se for customizado */}
                                                        {item.isCustomNet && <Pencil size={12} className="text-purple-400" />} 
                                                        +{formatVal(item.netAmount)} 
                                                    </span>
                                                    {item.source === 'TRANSACTION' && hasDifference && (
                                                        <span className="text-[10px] text-gray-500 block mt-1 line-through opacity-70">
                                                            Bruto: {formatVal(item.grossAmount)}
                                                        </span>
                                                    )}
                                                </div>

                                                {isEditable && (
                                                    <button 
                                                        onClick={() => onEditTransaction(item)}
                                                        className="p-2 rounded-lg bg-gray-700/50 hover:bg-purple-500 hover:text-white text-gray-400 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                                        title="Editar valor deste aporte"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-800 bg-gray-900 flex gap-3">
                    <button 
                        onClick={() => { onClose(); onEdit(goal); }}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 border border-gray-700"
                    >
                        <Pencil size={18}/> Editar Meta
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estados de UI
  const [mobileFormOpen, setMobileFormOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);
  const [goalToDeleteId, setGoalToDeleteId] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null); 
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null); 
  const [transactionToEdit, setTransactionToEdit] = useState<any | null>(null);

  // Estados para Aporte (Agora com Valor inicial)
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositInitialValue, setDepositInitialValue] = useState(0);
  const [depositTargetGoal, setDepositTargetGoal] = useState<Goal | null>(null);

  const [filterVehicleId, setFilterVehicleId] = useState<string>("ALL");
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState(""); 
  const [purpose, setPurpose] = useState("");
  const [deadline, setDeadline] = useState("");

  const mapGoalFromDB = (data: any): Goal => ({
      id: data.id,
      userId: data.user_id,
      linkedVehicleIds: data.linked_vehicle_ids || [],
      title: data.title,
      description: data.description,
      targetAmount: data.target_amount,
      currentAmount: data.current_amount,
      purpose: data.purpose,
      deadline: data.deadline,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
  });

  const mapVehicleFromDB = (data: any): Vehicle => ({
    id: data.id,
    userId: data.user_id,
    name: data.name,
    ...data
  });

  const fetchAllData = useCallback(async (userId: string) => {
    try {
      const [vehiclesRes, goalsRes] = await Promise.all([
        supabase.from("vehicles").select("*").eq("user_id", userId),
        supabase.from("goals").select("*").eq("user_id", userId)
      ]);

      if (vehiclesRes.error) throw vehiclesRes.error;
      if (goalsRes.error) throw goalsRes.error;

      if (vehiclesRes.data) {
          setVehicles(vehiclesRes.data.map(mapVehicleFromDB));
      }
      
      if (goalsRes.data) {
        const mappedGoals = goalsRes.data.map(mapGoalFromDB);
        setGoals(mappedGoals.sort((a, b) => (a.status === 'COMPLETED' ? 1 : -1)));
      }
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setCurrentUser(user);
            await fetchAllData(user.id);
        } else {
            setLoading(false);
        }
    };
    init();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) setCurrentUser(session.user);
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, [fetchAllData]);

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
      
      if (window.innerWidth < 1024) {
        setMobileFormOpen(true);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const handleCancelEdit = () => {
      setEditingGoal(null);
      resetForm();
      setMobileFormOpen(false); 
  };

  const resetForm = () => {
      setTitle(""); setDescription(""); setTargetAmount(""); setCurrentAmount("");
      setPurpose(""); setDeadline(""); setSelectedVehicleIds([]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);

    try {
      const initialCurrent = Number(currentAmount) || 0;
      const target = Number(targetAmount);
      
      const goalDataDB: any = {
        user_id: currentUser.id,
        linked_vehicle_ids: selectedVehicleIds,
        title,
        description,
        target_amount: target,
        current_amount: initialCurrent,
        purpose,
        deadline: deadline || null,
        status: initialCurrent >= target ? 'COMPLETED' : 'ACTIVE',
        updated_at: new Date().toISOString()
      };

      let error;
      
      if (!editingGoal) {
          goalDataDB.created_at = new Date().toISOString();
          const res = await supabase.from("goals").insert(goalDataDB);
          error = res.error;
          if (!error) setFeedback({ type: 'success', title: 'Meta Criada!', message: 'Seu objetivo foi criado com sucesso. 🚀' });
      } else {
          const res = await supabase.from("goals").update(goalDataDB).eq("id", editingGoal.id);
          error = res.error;
          if (!error) {
              setFeedback({ type: 'success', title: 'Meta Atualizada!', message: 'As alterações foram salvas.' });
              setEditingGoal(null);
          }
      }
      
      if (error) throw error;

      resetForm();
      setMobileFormOpen(false); 
      await fetchAllData(currentUser.id);

    } catch (error: any) {
      console.error(error);
      setFeedback({ type: 'error', title: 'Erro', message: error.message || 'Erro ao salvar' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (goalToDeleteId && currentUser) {
      try {
          // PASSO 1: Salvar os Ganhos Reais (Desvincular)
          const { error: unlinkError } = await supabase
              .from("transactions")
              .update({ linked_goal_id: null })
              .eq("linked_goal_id", goalToDeleteId)
              .neq("platform", "PARTICULAR"); // Protege o que não é manual

          if (unlinkError) throw unlinkError;

          // PASSO 2: Apagar Aportes Manuais
          const { error: deleteManualError } = await supabase
              .from("transactions")
              .delete()
              .eq("linked_goal_id", goalToDeleteId)
              .eq("platform", "PARTICULAR");

          if (deleteManualError) throw deleteManualError;

          // PASSO 3: Apagar a Meta
          const { error } = await supabase.from("goals").delete().eq("id", goalToDeleteId);
          
          if (error) throw error;
          
          setGoalToDeleteId(null);
          setFeedback({ type: 'success', title: 'Meta Excluída', message: 'Meta removida. Seus ganhos de corridas foram preservados no extrato.' });
          
          await fetchAllData(currentUser.id);
      } catch (error: any) {
          console.error("Erro ao excluir:", error);
          setFeedback({ type: 'error', title: 'Erro', message: error.message || "Não foi possível excluir a meta." });
      }
    }
  };

  const handleUpdateTransaction = async (transaction: any, newNetValue: number) => {
      if (!currentUser || !selectedGoal) return;
      
      // CORREÇÃO: newNetValue já vem do input como Reais (ex: 10.00)
      const currentNetValue = transaction.netAmount || 0; 
      
      const delta = newNetValue - currentNetValue;
      
      if (Math.abs(delta) < 0.01) return;

      try {
          // 1. Atualiza APENAS a coluna 'goal_net_amount' (guardando em CENTAVOS)
          // A coluna 'amount' (Bruto) permanece intacta
          const { error: txError } = await supabase
              .from("transactions")
              .update({ goal_net_amount: Math.round(newNetValue * 100) }) 
              .eq("id", transaction.id);

          if (txError) throw txError;

          // 2. Atualiza o Total da Meta (A meta já está em REAIS no estado)
          // Somamos o delta direto (ex: +5.00) e não convertido
          const currentGoalTotal = selectedGoal.currentAmount || 0;
          const newGoalTotal = currentGoalTotal + delta;

          const newStatus = newGoalTotal >= selectedGoal.targetAmount ? 'COMPLETED' : 'ACTIVE';

          const { error: goalError } = await supabase
              .from("goals")
              .update({ 
                  current_amount: newGoalTotal,
                  status: newStatus
              })
              .eq("id", selectedGoal.id);

          if (goalError) throw goalError;

          setFeedback({ type: 'success', title: 'Atualizado', message: 'Valor considerado para a meta foi ajustado. O ganho original foi mantido.' });
          
          await fetchAllData(currentUser.id);
          
          // Atualização otimista da UI
          setSelectedGoal(prev => prev ? { ...prev, currentAmount: newGoalTotal, status: newStatus as any } : null);

      } catch (error: any) {
          setFeedback({ type: 'error', title: 'Erro', message: error.message });
      }
  };

  const handleRemoveFromGoal = async (transaction: any) => {
      if (!currentUser || !selectedGoal) return;

      // Valor que será subtraído da meta (já está em Reais)
      const amountToRemove = transaction.netAmount || 0;
      const isManual = transaction.source === 'MANUAL';

      try {
          // 1. AÇÃO NO BANCO DE DADOS
          if (isManual) {
              // SE FOR MANUAL: Deleta o registro definitivamente
              const { error: delError } = await supabase
                  .from("transactions")
                  .delete()
                  .eq("id", transaction.id);
              
              if (delError) throw delError;

          } else {
              // SE FOR GANHO DE CORRIDA: Apenas desvincula (Update)
              const { error: upError } = await supabase
                  .from("transactions")
                  .update({ 
                      linked_goal_id: null, 
                      goal_net_amount: null 
                  })
                  .eq("id", transaction.id);

              if (upError) throw upError;
          }

          // 2. Atualiza o saldo da Meta
          const currentGoalTotal = selectedGoal.currentAmount || 0;
          const newGoalTotal = Math.max(0, currentGoalTotal - amountToRemove); // Evita negativo

          // Recalcula status
          const newStatus = newGoalTotal >= selectedGoal.targetAmount ? 'COMPLETED' : 'ACTIVE';

          const { error: goalError } = await supabase
              .from("goals")
              .update({ 
                  current_amount: newGoalTotal,
                  status: newStatus
              })
              .eq("id", selectedGoal.id);

          if (goalError) throw goalError;

          // Feedback visual
          const msg = isManual 
              ? 'Aporte manual excluído com sucesso.' 
              : 'Lançamento desvinculado. Ele voltou para seu extrato de ganhos.';

          setFeedback({ type: 'success', title: 'Removido', message: msg });
          
          await fetchAllData(currentUser.id);
          
          // Atualiza a UI imediatamente
          setSelectedGoal(prev => prev ? { ...prev, currentAmount: newGoalTotal, status: newStatus as any } : null);

      } catch (error: any) {
          setFeedback({ type: 'error', title: 'Erro', message: error.message });
      }
  };

  // === REGISTRO DE APORTE (CORRIGIDO PARA TYPE 'INCOME') ===
  const registerDeposit = async (goal: Goal, amountVal: number, depositDesc: string) => {
      if (!currentUser) return;
      
      const { error: txError } = await supabase.from("transactions").insert({
          user_id: currentUser.id,
          vehicle_id: null, 
          linked_goal_id: goal.id,
          amount: Math.round(amountVal * 100),
          date: new Date().toISOString(),
          type: 'INCOME', 
          description: depositDesc,
          platform: Platform.PARTICULAR,
          created_at: new Date().toISOString()
      });

      if (txError) throw txError;

      const newCurrent = goal.currentAmount + amountVal;
      const newStatus = newCurrent >= goal.targetAmount ? 'COMPLETED' : 'ACTIVE';
      
      const { error: goalError } = await supabase.from("goals").update({ 
          current_amount: newCurrent, 
          status: newStatus 
      }).eq("id", goal.id);

      if (goalError) throw goalError;
      await fetchAllData(currentUser.id);
  };

  const openDepositModal = (goal: Goal, initialVal: number = 0) => {
      setDepositTargetGoal(goal);
      setDepositInitialValue(initialVal);
      setIsDepositModalOpen(true);
  };

  const handleConfirmDeposit = async (val: number, desc: string) => {
      if (depositTargetGoal && val > 0) {
          try {
              await registerDeposit(depositTargetGoal, val, desc);
              setIsDepositModalOpen(false);
              setDepositTargetGoal(null);
              setFeedback({ type: 'success', title: 'Aporte Realizado!', message: `R$ ${val.toLocaleString('pt-BR')} adicionados à meta.` });
          } catch (error: any) {
              setFeedback({ type: 'error', title: 'Erro', message: error.message });
          }
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
      <FeedbackModal isOpen={!!feedback} onClose={() => setFeedback(null)} type={feedback?.type} title={feedback?.title} message={feedback?.message} />
      <ConfirmModal isOpen={!!goalToDeleteId} onClose={() => setGoalToDeleteId(null)} onConfirm={handleDeleteConfirm} title="Excluir Meta?" message="Isso apagará todo o histórico deste objetivo." />
      
      <InputModal 
          isOpen={isDepositModalOpen} 
          onClose={() => setIsDepositModalOpen(false)} 
          onConfirm={handleConfirmDeposit} 
          title="Novo Aporte"
          initialValue={depositInitialValue}
      />
      
      <EditTransactionModal 
        isOpen={!!transactionToEdit} 
        onClose={() => setTransactionToEdit(null)} 
        transaction={transactionToEdit}
        onConfirm={handleUpdateTransaction}
        onRemove={handleRemoveFromGoal}
      />

      <GoalDetailsModal 
        isOpen={!!selectedGoal} 
        onClose={() => setSelectedGoal(null)} 
        goal={selectedGoal} 
        vehicles={vehicles}
        onDelete={(id: string) => setGoalToDeleteId(id)}
        onEdit={handleEditInit}
        onEditTransaction={(tx: any) => setTransactionToEdit(tx)} 
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

      <div className="mb-6 lg:hidden">
        <button 
          onClick={() => { resetForm(); setEditingGoal(null); setMobileFormOpen(true); }}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 p-4 rounded-2xl flex items-center justify-center gap-2 text-white font-bold shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
        >
          <Plus size={24} /> Nova Meta
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`
          ${mobileFormOpen 
             ? 'fixed inset-0 z-[100] bg-gray-900/95 backdrop-blur-sm p-4 overflow-y-auto flex items-center justify-center animate-in slide-in-from-bottom-10 fade-in' 
             : 'hidden'
          } 
          lg:block lg:static lg:bg-transparent lg:p-0 lg:h-auto lg:col-span-1 lg:overflow-visible lg:flex-none
        `}>
          <div className={`p-6 rounded-2xl border transition-colors relative w-full max-w-lg lg:max-w-none shadow-2xl lg:shadow-xl lg:sticky lg:top-4 bg-gray-900 border-gray-800 ${editingGoal ? 'lg:bg-purple-900/10 lg:border-purple-500/30' : ''}`}>
            
            <button 
               onClick={() => setMobileFormOpen(false)} 
               className="lg:hidden absolute top-4 right-4 p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white"
            >
               <X size={20} />
            </button>

            <h2 className={`text-xl font-semibold mb-5 flex items-center gap-2 ${editingGoal ? 'text-purple-400' : 'text-emerald-500'}`}>
              {editingGoal ? <Pencil size={20}/> : <Plus size={20} />} 
              {editingGoal ? 'Editar Meta' : 'Nova Meta'}
            </h2>
            
            <form onSubmit={handleSave} className="space-y-4">
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
                {selectedVehicleIds.length === 0 && <div className="flex items-center gap-1 mt-2 text-gray-500 text-xs italic"><Info size={12} /> Nenhum selecionado (Meta Geral)</div>}
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

              <div className="flex gap-2 pt-2">
                  {editingGoal && (
                      <button type="button" onClick={handleCancelEdit} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3.5 rounded-xl transition-all">Cancelar</button>
                  )}
                  <button type="submit" disabled={isSaving} className={`flex-1 bg-gradient-to-r ${editingGoal ? 'from-purple-600 to-indigo-600' : 'from-emerald-600 to-teal-600'} hover:opacity-90 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center gap-2`}>
                    {isSaving ? "Salvando..." : editingGoal ? "Atualizar Meta" : "Traçar Meta"}
                  </button>
              </div>
            </form>
          </div>
        </div>

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
              const linkedCarNames = vehicles.filter(v => goal.linkedVehicleIds?.includes(v.id)).map(v => v.name);
              
              return (
                <div key={goal.id} onClick={() => setSelectedGoal(goal)} className={`relative bg-gray-900 rounded-2xl border p-6 transition-all group hover:border-gray-500 cursor-pointer ${isCompleted ? 'border-emerald-500/30 bg-emerald-900/5' : 'border-gray-800'}`}>
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
                               <span className="flex items-center gap-1 border-l border-gray-700 pl-2"><Calendar size={12}/> {new Date(goal.deadline).toLocaleDateString('pt-BR')}</span>
                             )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {linkedCarNames.length > 0 ? (
                                linkedCarNames.map((name, idx) => (
                                    <span key={idx} className="bg-blue-900/20 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold flex items-center gap-1"><Car size={10}/> {name}</span>
                                ))
                            ) : (
                                <span className="text-gray-600 text-[10px] bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">Geral</span>
                            )}
                          </div>
                        </div>
                    </div>
                  </div>
                  {goal.description && <p className="text-gray-400 text-sm mb-4 leading-relaxed line-clamp-2">{goal.description}</p>}
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 mb-2">
                      <div className="flex justify-between items-end mb-2">
                          <div className="flex flex-col">
                             <span className="text-[10px] uppercase text-gray-500 font-bold mb-1">Alcançado</span>
                             <span className={`text-2xl font-bold ${isCompleted ? 'text-emerald-400' : 'text-white'}`}>{formatMoney(goal.currentAmount)}</span>
                          </div>
                          <div className="flex flex-col items-end">
                             <span className="text-[10px] uppercase text-gray-500 font-bold mb-1">Meta</span>
                             <span className="text-lg font-medium text-gray-400">{formatMoney(goal.targetAmount)}</span>
                          </div>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-purple-600'}`} style={{ width: `${progress}%` }}></div>
                      </div>
                  </div>
                  {!isCompleted && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
                        <p className="text-[10px] text-gray-500 self-center mr-auto uppercase font-bold hidden sm:block">Aportar:</p>
                        
                        {[50, 100, 500].map(val => (
                            <button key={val} onClick={(e) => { e.stopPropagation(); openDepositModal(goal, val); }} className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-emerald-600 hover:text-white text-emerald-500 text-xs font-bold border border-gray-700 transition-all flex items-center gap-1 shadow-sm active:scale-95">
                                <TrendingUp size={12}/> +{val}
                            </button>
                        ))}
                        
                        <button onClick={(e) => { e.stopPropagation(); openDepositModal(goal, 0); }} className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold border border-gray-700 transition-all active:scale-95">Outro</button>
                    </div>
                  )}
                  {isCompleted && <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold justify-center bg-emerald-500/10 rounded-lg py-2 mt-4 border border-emerald-500/20"><CheckCircle2 size={16} /> Meta Conquistada!</div>}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}