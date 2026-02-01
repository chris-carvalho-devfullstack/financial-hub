// app/routes/ganhos.tsx

import { useEffect, useState } from "react";
import { 
  collection, addDoc, deleteDoc, doc, query, where, onSnapshot, orderBy, limit, updateDoc, getDocs, increment, setDoc
} from "firebase/firestore"; 
import { 
  Car, Clock, Map, DollarSign, Briefcase, 
  History, CheckCircle2, Zap, 
  LayoutGrid, ChevronUp, Trash2, Gauge,
  AlertTriangle, Navigation, FileText,
  Pencil, X, Save, Calendar, ExternalLink,
  Info, Target, Layers
} from "lucide-react";
import { db, auth } from "~/lib/app/firebase.client";
import { Platform } from "~/types/enums";
import type { Vehicle, IncomeTransaction, Goal } from "~/types/models";

// === TIPO LOCAL PARA SUPORTAR O SPLIT ===
interface IncomeTransactionWithSplit extends IncomeTransaction {
  split?: {
    platform: Platform;
    amount: number;
    trips?: number;
  }[];
}

// === CONFIGURAÇÃO DAS PLATAFORMAS ===
const ALL_PLATFORMS = [
  { 
    id: Platform.UBER, 
    label: 'Uber', 
    logo: '/logos/uber.png', 
    bg: 'bg-black',
    textColor: 'text-white'
  },
  { 
    id: Platform.NINETY_NINE, 
    label: '99', 
    logo: '/logos/99.png', 
    bg: 'bg-yellow-400',
    textColor: 'text-black'
  },
  { 
    id: Platform.IFOOD, 
    label: 'iFood', 
    logo: '/logos/ifood.png', 
    bg: 'bg-red-500',
    textColor: 'text-white'
  },
  { 
    id: 'ZE_DELIVERY' as Platform, 
    label: 'Zé Delivery', 
    logo: '/logos/ze-delivery.png', 
    bg: 'bg-yellow-500',
    textColor: 'text-black'
  },
  { 
    id: Platform.INDRIVER, 
    label: 'InDrive', 
    logo: '/logos/indriver.png', 
    bg: 'bg-green-500',
    textColor: 'text-white'
  },
  { 
    id: Platform.PARTICULAR, 
    label: 'Particular', 
    logo: '', 
    icon: <Briefcase size={28} className="text-white" />,
    bg: 'bg-blue-600',
    textColor: 'text-white'
  },
];

// Configuração Visual para MULTIPLE
const MULTIPLE_PLATFORM_CONFIG = {
  id: 'MULTIPLE',
  label: 'Múltiplos Apps',
  icon: <Layers size={32} className="text-white" />, // Icone maior para o header
  bg: 'bg-indigo-600',
  textColor: 'text-white'
};

// === COMPONENTES AUXILIARES ===

// --- COMPONENTE DE FEEDBACK ---
function FeedbackModal({ isOpen, onClose, type = 'success', title, message }: any) {
  if (!isOpen) return null;

  const isSuccess = type === 'success';
  const Icon = isSuccess ? CheckCircle2 : AlertTriangle;
  const iconColor = isSuccess ? 'text-emerald-500' : 'text-red-500';
  const bgColor = isSuccess ? 'bg-emerald-500/10' : 'bg-red-500/10';
  const buttonColor = isSuccess ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex flex-col items-center text-center gap-4">
          <div className={`${bgColor} p-4 rounded-full`}>
            <Icon className={iconColor} size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <p className="text-gray-400 text-sm mt-2">{message}</p>
          </div>
          <button
            onClick={onClose}
            className={`w-full ${buttonColor} text-white py-3 rounded-xl font-bold transition-colors mt-2`}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-start gap-4">
          <div className="bg-red-500/10 p-3 rounded-full">
            <AlertTriangle className="text-red-500" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-gray-400 text-sm mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button 
            onClick={onClose} 
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm} 
            className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg font-medium transition-colors"
          >
            Sim, excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// === MODAL DE DETALHES E EDIÇÃO ===
function TransactionDetailsModal({ isOpen, onClose, transaction, onUpdate }: { isOpen: boolean, onClose: () => void, transaction: IncomeTransactionWithSplit | null, onUpdate: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  
  // Estado para os splits editáveis
  const [splitFormData, setSplitFormData] = useState<any[]>([]);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{isOpen: boolean, type: 'success'|'error', title: string, message: string} | null>(null);

  // Carrega os dados quando a transação muda ou o modal abre
  useEffect(() => {
    if (transaction) {
      setFormData({
        amount: (transaction.amount / 100).toFixed(2),
        date: new Date(transaction.date).toLocaleDateString('en-CA'),
        distanceDriven: transaction.distanceDriven || 0,
        odometer: transaction.odometer || 0,
        clusterKmPerLiter: transaction.clusterKmPerLiter || 0,
        onlineDurationMinutes: transaction.onlineDurationMinutes ? (transaction.onlineDurationMinutes / 60).toFixed(1) : 0,
        tripsCount: transaction.tripsCount || 0,
        description: transaction.description || ""
      });

      // Carrega o split e converte centavos para reais (string)
      if (transaction.split && transaction.split.length > 0) {
        setSplitFormData(transaction.split.map(s => ({
            ...s,
            amount: (s.amount / 100).toFixed(2),
            trips: s.trips || 0
        })));
      } else {
        setSplitFormData([]);
      }

      setIsEditing(false);
    }
  }, [transaction]);

  // Recalcula totais quando o splitFormData é alterado durante a edição
  useEffect(() => {
    if (isEditing && splitFormData.length > 0) {
        let totalAmount = 0;
        let totalTrips = 0;

        splitFormData.forEach(item => {
            totalAmount += parseFloat(item.amount?.toString().replace(',', '.') || "0");
            totalTrips += parseInt(item.trips || "0");
        });

        setFormData((prev: any) => ({
            ...prev,
            amount: totalAmount.toFixed(2),
            tripsCount: totalTrips
        }));
    }
  }, [splitFormData, isEditing]);

  if (!isOpen || !transaction) return null;

  const isMultiple = (transaction.platform as string) === 'MULTIPLE';
  
  // Lógica correta para pegar configuração
  const platformInfo = isMultiple 
      ? MULTIPLE_PLATFORM_CONFIG 
      : ALL_PLATFORMS.find(p => p.id === transaction.platform) || ALL_PLATFORMS[5];

  const handleUpdateSplitField = (index: number, field: 'amount' | 'trips', value: string) => {
    const newSplit = [...splitFormData];
    newSplit[index] = { ...newSplit[index], [field]: value };
    setSplitFormData(newSplit);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = {
        amount: Math.round(parseFloat(formData.amount.replace(',', '.')) * 100),
        date: new Date(`${formData.date}T00:00:00`).toISOString(),
        distanceDriven: Number(formData.distanceDriven),
        odometer: Number(formData.odometer),
        clusterKmPerLiter: Number(formData.clusterKmPerLiter),
        onlineDurationMinutes: Math.round(Number(formData.onlineDurationMinutes) * 60),
        tripsCount: Number(formData.tripsCount),
        description: formData.description
      };

      // Se for múltiplo, precisamos salvar o split atualizado
      if (isMultiple && splitFormData.length > 0) {
        updates.split = splitFormData.map(item => ({
            platform: item.platform,
            amount: Math.round(parseFloat(item.amount.toString().replace(',', '.')) * 100),
            trips: Number(item.trips)
        }));
      }

      await onUpdate(transaction.id, updates);
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Atualizar',
        message: 'Não foi possível salvar as alterações. Tente novamente.'
      });
    } finally {
      setSaving(false);
    }
  };

  const InputField = ({ label, field, type = "number", step="any", readOnly = false }: any) => (
    <div className={`bg-gray-800/50 p-2 rounded-lg border border-gray-700 ${readOnly ? 'opacity-60' : ''}`}>
      <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">{label}</label>
      <input 
        type={type} 
        step={step}
        readOnly={readOnly}
        value={formData[field]} 
        onChange={e => !readOnly && setFormData({...formData, [field]: e.target.value})}
        className={`w-full bg-transparent text-white font-bold outline-none border-b text-sm py-1 ${readOnly ? 'border-transparent cursor-not-allowed' : 'border-gray-600 focus:border-emerald-500'}`}
      />
    </div>
  );

  const DisplayField = ({ label, value, icon: Icon, color = "text-gray-400" }: any) => (
    <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-800">
       <div className="flex items-center gap-2">
         {Icon && <Icon size={16} className={color} />}
         <span className="text-sm text-gray-400">{label}</span>
       </div>
       <span className="font-bold text-white text-sm">{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      
      {feedback && (
          <FeedbackModal 
             isOpen={feedback.isOpen} 
             type={feedback.type} 
             title={feedback.title} 
             message={feedback.message} 
             onClose={() => setFeedback(null)} 
          />
      )}

      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className={`p-6 pb-8 relative ${platformInfo.bg}`}>
           <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors">
              <X size={20} />
           </button>
           
           <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-2xl shadow-xl flex items-center justify-center p-2 mb-4 overflow-hidden ${isMultiple ? 'bg-indigo-500/50 backdrop-blur-sm border border-white/20' : 'bg-white'}`}>
                  {/* Lógica de Renderização do Ícone/Logo */}
                  {isMultiple ? (
                    platformInfo.icon // Renderiza o <Layers />
                  ) : (
                    (platformInfo as any).logo ? <img src={(platformInfo as any).logo} className="w-full object-contain" /> : platformInfo.icon
                  )}
              </div>
              <h2 className={`text-2xl font-bold ${platformInfo.textColor === 'text-black' ? 'text-gray-900' : 'text-white'}`}>
                {platformInfo.label}
              </h2>
              <div className={`text-sm font-medium opacity-80 ${platformInfo.textColor === 'text-black' ? 'text-gray-800' : 'text-gray-300'}`}>
                 {isEditing ? 'Editando Lançamento' : 'Detalhes do Lançamento'}
              </div>
           </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
           {isEditing ? (
              <div className="grid grid-cols-2 gap-3">
                 
                 {/* SE FOR MULTIPLE: MOSTRA CAMPOS DE EDIÇÃO INDIVIDUAL */}
                 {isMultiple && splitFormData.length > 0 && (
                    <div className="col-span-2 space-y-2 mb-2 bg-gray-800/30 p-3 rounded-xl border border-dashed border-gray-700">
                        <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-2 flex items-center gap-1">
                             <Layers size={10} /> Editar Valores por App
                        </h4>
                        {splitFormData.map((item, idx) => {
                            const appInfo = ALL_PLATFORMS.find(p => p.id === item.platform) || ALL_PLATFORMS[5];
                            return (
                                <div key={idx} className="flex gap-2 items-center mb-2">
                                    <div className="w-20 text-xs text-white font-bold truncate">{appInfo.label}</div>
                                    <div className="flex-1">
                                        <input 
                                            type="number" step="0.01" 
                                            value={item.amount}
                                            onChange={(e) => handleUpdateSplitField(idx, 'amount', e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                                            placeholder="R$"
                                        />
                                    </div>
                                    <div className="w-16">
                                        <input 
                                            type="number"
                                            value={item.trips}
                                            onChange={(e) => handleUpdateSplitField(idx, 'trips', e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                                            placeholder="Viagens"
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                 )}

                 <div className="col-span-2">
                    <InputField label={isMultiple ? "Valor Total (Calculado)" : "Valor (R$)"} field="amount" step="0.01" readOnly={isMultiple} />
                 </div>
                 <div className="col-span-2">
                    <InputField label="Data" field="date" type="date" />
                 </div>
                 <InputField label="KM Trip" field="distanceDriven" />
                 <InputField label="Odômetro" field="odometer" />
                 <InputField label="Média Painel" field="clusterKmPerLiter" step="0.1" />
                 <InputField label="Horas Online" field="onlineDurationMinutes" step="0.1" />
                 <InputField label={isMultiple ? "Viagens Total" : "Viagens"} field="tripsCount" readOnly={isMultiple} />
                 <div className="col-span-2">
                   <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700">
                      <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Observação</label>
                      <input 
                        type="text"
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        className="w-full bg-transparent text-white font-medium outline-none border-b border-gray-600 focus:border-emerald-500 text-sm py-1"
                      />
                   </div>
                 </div>
              </div>
           ) : (
              <div className="space-y-4">
                 <div className="text-center mb-6">
                    <span className="text-4xl font-bold text-emerald-400">
                       {(Number(formData.amount)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    <p className="text-gray-500 text-sm mt-1 flex items-center justify-center gap-1">
                       <Calendar size={12}/> {new Date(formData.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                 </div>

                 {/* DETALHAMENTO DO SPLIT (VIEW MODE) */}
                 {isMultiple && transaction.split && (
                   <div className="bg-gray-800/40 rounded-xl p-3 border border-gray-700/50 space-y-2">
                      <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-2 flex items-center gap-1">
                        <Layers size={10} /> Detalhamento por App
                      </h4>
                      {transaction.split.map((item, idx) => {
                        const appInfo = ALL_PLATFORMS.find(p => p.id === item.platform) || ALL_PLATFORMS[5];
                        return (
                          <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white p-1 shadow-sm flex items-center justify-center">
                                  {appInfo.logo ? <img src={appInfo.logo} className="w-full h-full object-contain"/> : <Briefcase size={14} className="text-gray-800"/>}
                                </div>
                                <div>
                                   <p className="text-white text-xs font-bold">{appInfo.label}</p>
                                   <p className="text-gray-500 text-[10px]">{item.trips} viagens</p>
                                </div>
                             </div>
                             <span className="text-emerald-400 font-bold text-sm">
                               {(item.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                             </span>
                          </div>
                        )
                      })}
                   </div>
                 )}

                 <div className="grid grid-cols-2 gap-3">
                    <DisplayField label="KM Trip" value={`${formData.distanceDriven} km`} icon={Map} color="text-blue-500" />
                    <DisplayField label="Odômetro" value={`${formData.odometer} km`} icon={Navigation} color="text-emerald-500" />
                    <DisplayField label="Média" value={`${formData.clusterKmPerLiter} km/l`} icon={Gauge} color="text-orange-500" />
                    <DisplayField label="Duração" value={`${formData.onlineDurationMinutes} h`} icon={Clock} color="text-yellow-500" />
                    <DisplayField label="Viagens Totais" value={formData.tripsCount} icon={Briefcase} color="text-purple-500" />
                 </div>

                 {formData.description && (
                    <div className="mt-4 p-3 bg-gray-800 rounded-xl border border-dashed border-gray-700">
                       <h4 className="text-xs uppercase text-gray-500 font-bold mb-1 flex items-center gap-1">
                          <FileText size={12}/> Observação
                       </h4>
                       <p className="text-gray-300 text-sm italic">"{formData.description}"</p>
                    </div>
                 )}
              </div>
           )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex gap-3">
           {isEditing ? (
             <>
               <button 
                 onClick={() => setIsEditing(false)}
                 className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition-colors"
               >
                 Cancelar
               </button>
               <button 
                 onClick={handleSave}
                 disabled={saving}
                 className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
               >
                 {saving ? "Salvando..." : <><Save size={18}/> Salvar</>}
               </button>
             </>
           ) : (
             <button 
               onClick={() => setIsEditing(true)}
               className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 border border-gray-700"
             >
               <Pencil size={18} /> Editar Lançamento
             </button>
           )}
        </div>

      </div>
    </div>
  );
}


// === PÁGINA PRINCIPAL ===

export default function GanhosPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [recentGains, setRecentGains] = useState<IncomeTransactionWithSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [lastFuelPrice, setLastFuelPrice] = useState(0); 
  
  // ESTADO PARA O MODAL DE DETALHES
  const [selectedTransaction, setSelectedTransaction] = useState<IncomeTransactionWithSplit | null>(null);

  // NOVO: Feedback Global
  const [feedback, setFeedback] = useState<{isOpen: boolean, type: 'success'|'error', title: string, message: string} | null>(null);

  // === ESTADOS DO FORMULÁRIO ===
  const [selectedVehicle, setSelectedVehicle] = useState("");
  
  // SELEÇÃO MÚLTIPLA
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]); // Array para múltipla escolha
  const [splitData, setSplitData] = useState<{[key: string]: { amount: string, trips: string }}>({}); // Dados individuais por app

  const [targetGoalId, setTargetGoalId] = useState("");
  
  // Totais (Calculados ou inseridos)
  const [amount, setAmount] = useState("");
  const [trips, setTrips] = useState("");
  
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [distance, setDistance] = useState(""); 
  const [odometerInput, setOdometerInput] = useState(""); 
  const [clusterAvg, setClusterAvg] = useState(""); 
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState(""); 

  const displayedPlatforms = showAllPlatforms ? ALL_PLATFORMS : ALL_PLATFORMS.slice(0, 3);

  // === EFEITO PARA SOMAR TOTAIS SE HOUVER MÚLTIPLOS APPS ===
  useEffect(() => {
    if (selectedPlatforms.length > 1) {
      let totalAmount = 0;
      let totalTrips = 0;

      selectedPlatforms.forEach(pId => {
        const data = splitData[pId];
        if (data) {
          totalAmount += parseFloat(data.amount.replace(',', '.')) || 0;
          totalTrips += parseInt(data.trips) || 0;
        }
      });

      setAmount(totalAmount > 0 ? totalAmount.toFixed(2) : "");
      setTrips(totalTrips > 0 ? totalTrips.toString() : "");
    }
  }, [splitData, selectedPlatforms]);

  // Função para alternar seleção de plataforma
  const togglePlatform = (id: Platform) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(id)) {
        return prev.filter(p => p !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Função para atualizar dados do split
  const updateSplitData = (platformId: string, field: 'amount' | 'trips', value: string) => {
    setSplitData(prev => ({
      ...prev,
      [platformId]: {
        ...prev[platformId],
        [field]: value
      }
    }));
  };

  // === 1. BUSCAR DADOS INICIAIS ===
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        // Veículos
        const qVehicles = query(collection(db, "vehicles"), where("userId", "==", user.uid));
        const unsubVehicles = onSnapshot(qVehicles, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Vehicle[];
          setVehicles(data);
          if (data.length > 0 && !selectedVehicle) {
             setSelectedVehicle(data[0].id);
          }
        });

        // Preferência do Usuário
        const userRef = doc(db, "users", user.uid);
        const unsubUser = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data();
                if (userData.lastSelectedVehicleId) {
                    setSelectedVehicle(userData.lastSelectedVehicleId);
                }
            }
        });

        // Metas Ativas
        const qGoals = query(
             collection(db, "goals"), 
             where("userId", "==", user.uid),
             where("status", "==", "ACTIVE")
        );
        const unsubGoals = onSnapshot(qGoals, (snap) => {
             setActiveGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Goal[]);
        });

        return () => {
            unsubVehicles();
            unsubUser();
            unsubGoals();
        };
      }
    });
    return () => unsubAuth && unsubAuth();
  }, []);

  // === 2. BUSCAR HISTÓRICO ===
  useEffect(() => {
    if (!auth.currentUser || !selectedVehicle) return;

    setLoading(true);
    const qGains = query(
      collection(db, "transactions"), 
      where("userId", "==", auth.currentUser.uid),
      where("vehicleId", "==", selectedVehicle),
      where("type", "==", "INCOME"),
      orderBy("date", "desc"),
      limit(10)
    );

    const unsub = onSnapshot(qGains, (snap) => {
      setRecentGains(snap.docs.map(d => ({ id: d.id, ...d.data() })) as IncomeTransactionWithSplit[]);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedVehicle]);

  // === 3. PREÇO COMBUSTIVEL E ODÔMETRO ===
  useEffect(() => {
    if (!selectedVehicle) return;
    
    // Preço
    const fetchLastPrice = async () => {
      const q = query(
        collection(db, "transactions"),
        where("vehicleId", "==", selectedVehicle),
        where("category", "==", "FUEL"), 
        orderBy("date", "desc"),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setLastFuelPrice(snap.docs[0].data().pricePerLiter || 0);
      } else {
        setLastFuelPrice(0);
      }
    };
    fetchLastPrice();

    // Odômetro
    if (vehicles.length > 0) {
        const v = vehicles.find(vec => vec.id === selectedVehicle);
        if (v) {
            setOdometerInput(String(v.currentOdometer || 0));
        }
    }
  }, [selectedVehicle, vehicles]);

  const preventNegativeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["-", "e"].includes(e.key)) {
      e.preventDefault();
    }
  };

  // === CÁLCULOS ===
  const tripKm = parseFloat(distance) || 0;
  const panelAvg = parseFloat(clusterAvg) || 0;
  
  const estimatedCost = (panelAvg > 0 && lastFuelPrice > 0) 
      ? (tripKm / panelAvg) * lastFuelPrice 
      : 0;
  
  const currentIncome = parseFloat(amount.replace(',', '.')) || 0;
  const estimatedProfit = currentIncome - estimatedCost;

  const goalsForThisVehicle = activeGoals.filter(g => 
    !g.linkedVehicleIds || 
    g.linkedVehicleIds.length === 0 || 
    g.linkedVehicleIds.includes(selectedVehicle)
  );

  // === AÇÕES ===

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !selectedVehicle) return;
    if (selectedPlatforms.length === 0) {
      setFeedback({ isOpen: true, type: 'error', title: 'Atenção', message: 'Selecione pelo menos uma plataforma.' });
      return;
    }

    setSaving(true);

    try {
      const amountCents = Math.round(parseFloat(amount.replace(',', '.')) * 100);
      const hoursNum = parseFloat(hours.replace(',', '.')) || 0;
      const avgNum = parseFloat(clusterAvg.replace(',', '.')) || 0;
      const drivenKm = Number(distance) || 0;          
      const finalOdometer = Number(odometerInput) || 0; 
      const tripsNum = Number(trips) || 0;

      // DEFINIR PLATAFORMA E SPLIT
      let finalPlatform = selectedPlatforms[0];
      let finalSplit = null;

      if (selectedPlatforms.length > 1) {
          finalPlatform = 'MULTIPLE' as Platform;
          finalSplit = selectedPlatforms.map(pId => ({
              platform: pId,
              amount: Math.round(parseFloat(splitData[pId]?.amount?.replace(',', '.') || "0") * 100),
              trips: Number(splitData[pId]?.trips || 0)
          }));
      }

      const currentVehicle = vehicles.find(v => v.id === selectedVehicle);
      const startOdometer = currentVehicle?.currentOdometer || 0;

      const transactionData: any = {
        userId: auth.currentUser.uid,
        vehicleId: selectedVehicle,
        type: 'INCOME',
        platform: finalPlatform,
        amount: amountCents,
        date: new Date(`${date}T00:00:00`).toISOString(),
        distanceDriven: drivenKm, 
        onlineDurationMinutes: Math.round(hoursNum * 60),
        tripsCount: tripsNum,
        clusterKmPerLiter: avgNum,
        odometer: finalOdometer, 
        description: description, 
        createdAt: new Date().toISOString()
      };

      if (finalSplit) {
        transactionData.split = finalSplit;
      }

      if (targetGoalId) {
          transactionData.linkedGoalId = targetGoalId;
      }

      await addDoc(collection(db, "transactions"), transactionData);

      if (finalOdometer > startOdometer) {
         const vehicleRef = doc(db, "vehicles", selectedVehicle);
         await updateDoc(vehicleRef, {
            currentOdometer: finalOdometer,
            lastOdometerDate: new Date(`${date}T12:00:00`).toISOString(),
            updatedAt: new Date().toISOString()
         });
      }

      if (targetGoalId && estimatedProfit > 0) {
          await updateDoc(doc(db, "goals", targetGoalId), {
              currentAmount: increment(estimatedProfit)
          });
          setFeedback({
            isOpen: true,
            type: 'success',
            title: 'Meta Atualizada!',
            message: `Sucesso! ${estimatedProfit.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} foram destinados para a meta! 🎯`
          });
      }

      // RESET
      setAmount("");
      setDistance("");
      setOdometerInput(""); 
      setHours("");
      setTrips("");
      setClusterAvg(""); 
      setDescription(""); 
      setTargetGoalId(""); 
      setSelectedPlatforms([]);
      setSplitData({});
      
      setSaving(false);
    } catch (error) {
      console.error(error);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Salvar',
        message: 'Ocorreu um erro ao registrar o ganho. Tente novamente.'
      });
      setSaving(false);
    }
  };

  const handleUpdateTransaction = async (id: string, data: any) => {
     try {
       const ref = doc(db, "transactions", id);
       await updateDoc(ref, data);
     } catch (error) {
       throw error;
     }
  };

  const handleRequestDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setItemToDelete(id);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setDeletingId(itemToDelete);
    try { 
      await deleteDoc(doc(db, "transactions", itemToDelete)); 
    } catch (e) { 
      console.error(e); 
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Excluir',
        message: 'Não foi possível excluir o registro.'
      });
    } finally { 
      setDeletingId(null); 
      setItemToDelete(null);
    }
  };

  const formatMoney = (val: number) => (val / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatMoneyFloat = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  
  // Função atualizada para retornar dados de MULTIPLE se necessário
  const getPlatformDetails = (id: string) => {
    if (id === 'MULTIPLE') return MULTIPLE_PLATFORM_CONFIG;
    return ALL_PLATFORMS.find(p => p.id === id) || ALL_PLATFORMS[5];
  };

  return (
    <div className="pb-32 pt-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* MODAIS */}
      {feedback && (
          <FeedbackModal 
             isOpen={feedback.isOpen} 
             type={feedback.type} 
             title={feedback.title} 
             message={feedback.message} 
             onClose={() => setFeedback(null)} 
          />
      )}

      <ConfirmModal 
        isOpen={!!itemToDelete} 
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
        title="Excluir Registro?"
        message="Essa ação removerá o valor do seu faturamento e não pode ser desfeita."
      />

      <TransactionDetailsModal 
        isOpen={!!selectedTransaction}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onUpdate={handleUpdateTransaction}
      />

      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="flex-1 w-full md:max-w-2xl">
          
          <header className="mb-6 md:h-[88px] flex flex-col justify-center">
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
              <Zap className="text-yellow-500 fill-yellow-500" size={28} /> Registrar Ganho
            </h1>
            <p className="text-gray-400 text-sm md:text-base">Selecione o(s) app(s) e lance o faturamento.</p>
          </header>

          <form onSubmit={handleSave} className="space-y-6 md:space-y-8">
              
             {/* SELEÇÃO DE VEÍCULO */}
             <div className="bg-gray-900/50 p-3 md:p-4 rounded-xl border border-gray-800 active:border-emerald-500/50 transition-colors">
               <label className="text-gray-400 text-xs font-bold uppercase mb-2 block tracking-wider">Veículo</label>
               <div className="relative">
                  <Car className="absolute left-3 top-3.5 text-gray-500" size={18} />
                  <select 
                    value={selectedVehicle}
                    onChange={async (e) => {
                        const newId = e.target.value;
                        setSelectedVehicle(newId);
                        if (auth.currentUser) {
                            await setDoc(doc(db, "users", auth.currentUser.uid), { lastSelectedVehicleId: newId }, { merge: true });
                        }
                    }}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none font-medium h-12"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
               </div>
            </div>

            {/* PLATAFORMA (MULTI-SELECT) */}
            <div>
               <label className="text-gray-400 text-xs font-bold uppercase mb-3 block tracking-wider">
                 Plataforma(s) {selectedPlatforms.length > 0 && <span className="text-emerald-500 ml-1">({selectedPlatforms.length})</span>}
               </label>
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {displayedPlatforms.map((p) => {
                     const isSelected = selectedPlatforms.includes(p.id);
                     return (
                       <button
                         key={p.id}
                         type="button"
                         onClick={() => togglePlatform(p.id as Platform)}
                         className={`relative h-28 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center gap-2 group overflow-hidden active:scale-95 ${isSelected ? `${p.bg} ${p.textColor} border-transparent shadow-lg ring-2 ring-white/30` : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'}`}
                       >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden ${!p.logo ? 'bg-white/10' : 'bg-white'} ${isSelected ? 'shadow-lg scale-110' : 'opacity-90 group-hover:scale-110 transition-transform'}`}>
                            {p.logo ? <img src={p.logo} alt={p.label} className="w-full h-full object-cover" /> : p.icon}
                          </div>
                          <span className="font-bold text-sm tracking-tight">{p.label}</span>
                          {isSelected && <CheckCircle2 size={18} className="absolute top-2 right-2 text-white drop-shadow-md" />}
                       </button>
                     )
                  })}
                  {!showAllPlatforms && (
                    <button type="button" onClick={() => setShowAllPlatforms(true)} className="h-28 rounded-2xl border border-gray-800 bg-gray-900/50 hover:bg-gray-800 text-gray-400 hover:text-white transition-all flex flex-col items-center justify-center gap-2 group active:scale-95">
                      <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center group-hover:bg-gray-700"><LayoutGrid size={20} /></div>
                      <span className="font-bold text-sm">Ver Mais</span>
                    </button>
                  )}
                  {showAllPlatforms && (
                    <button type="button" onClick={() => setShowAllPlatforms(false)} className="h-28 rounded-2xl border border-dashed border-gray-700 bg-transparent text-gray-500 hover:text-white hover:border-gray-500 transition-all flex flex-col items-center justify-center gap-1 active:scale-95">
                      <ChevronUp size={24} /><span className="text-xs font-medium">Recolher</span>
                    </button>
                  )}
               </div>
            </div>

            {/* ÁREA DE INPUT DE VALORES (CONDICIONAL: SINGLE vs MULTIPLE) */}
            
            {/* SE MÚLTIPLOS APPS: MOSTRAR INPUTS INDIVIDUAIS */}
            {selectedPlatforms.length > 1 && (
               <div className="space-y-3 bg-gray-900/30 p-4 rounded-xl border border-gray-800">
                  <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                     <Layers size={14} /> Detalhamento por App
                  </h4>
                  {selectedPlatforms.map(pId => {
                     const pInfo = ALL_PLATFORMS.find(p => p.id === pId) || ALL_PLATFORMS[5];
                     return (
                        <div key={pId} className="flex flex-col sm:flex-row gap-3 items-center bg-gray-900 p-3 rounded-xl border border-gray-700">
                           <div className="flex items-center gap-3 w-full sm:w-auto">
                              <div className="w-8 h-8 rounded-lg bg-white p-0.5 flex items-center justify-center">
                                 {pInfo.logo ? <img src={pInfo.logo} className="w-full h-full object-contain"/> : pInfo.icon}
                              </div>
                              <span className="text-white font-bold text-sm w-20">{pInfo.label}</span>
                           </div>
                           
                           <div className="flex gap-2 w-full">
                              <div className="relative flex-1">
                                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">R$</span>
                                 <input 
                                    type="number" step="0.01" placeholder="0.00"
                                    value={splitData[pId]?.amount || ""}
                                    onChange={(e) => updateSplitData(pId, 'amount', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg py-2 pl-8 pr-2 text-white text-sm focus:border-emerald-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                 />
                              </div>
                              <div className="relative w-24">
                                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] uppercase">Trips</span>
                                 <input 
                                    type="number" placeholder="0"
                                    value={splitData[pId]?.trips || ""}
                                    onChange={(e) => updateSplitData(pId, 'trips', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg py-2 pl-3 pr-10 text-white text-sm focus:border-purple-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                 />
                              </div>
                           </div>
                        </div>
                     )
                  })}
               </div>
            )}

            {/* DADOS FINANCEIROS GERAIS (TOTAL OU ÚNICO) */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-6 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="col-span-1 md:col-span-2">
                      <label className="text-emerald-400 text-xs font-bold uppercase mb-2 block tracking-wider">
                         {selectedPlatforms.length > 1 ? "Valor Total (Calculado)" : "Valor Total (R$)"}
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-xl md:text-2xl">R$</span>
                        <input 
                          type="number" step="0.01" required inputMode="decimal" min="0"
                          // Se tiver multiplos, é readOnly
                          readOnly={selectedPlatforms.length > 1}
                          value={amount} onChange={e => setAmount(e.target.value)} 
                          onKeyDown={preventNegativeInput}
                          className={`w-full bg-gray-950 border border-emerald-500/30 rounded-xl py-4 pl-12 md:pl-14 text-white text-2xl md:text-3xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none placeholder-emerald-900/30 h-16 md:h-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${selectedPlatforms.length > 1 ? 'opacity-80 cursor-not-allowed text-emerald-200' : ''}`}
                          placeholder="0,00" 
                        />
                      </div>
                  </div>
                  <div>
                      <label className="text-gray-500 text-xs font-bold uppercase mb-2 block tracking-wider">Data</label>
                      <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 md:p-4 text-white focus:border-emerald-500 outline-none h-12 md:h-14"/>
                  </div>
               </div>
            </div>

            {/* === SELETOR DE META INTELIGENTE === */}
            {goalsForThisVehicle.length > 0 && (
                <div className="bg-gradient-to-br from-purple-900/20 to-gray-900 border border-purple-500/20 p-4 rounded-xl shadow-lg">
                   <div className="flex items-center gap-2 mb-3">
                       <Target size={18} className="text-purple-400" />
                       <span className="text-purple-100 font-bold text-sm">Destinar Lucro para Meta (Opcional)</span>
                   </div>
                   
                   <div className="relative">
                      <select 
                        value={targetGoalId} 
                        onChange={e => setTargetGoalId(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-purple-500 appearance-none cursor-pointer"
                      >
                          <option value="">-- Não destinar --</option>
                          {goalsForThisVehicle.map(g => (
                              <option key={g.id} value={g.id}>
                                 {g.title} (Faltam {formatMoneyFloat(g.targetAmount - g.currentAmount)})
                              </option>
                          ))}
                      </select>
                      <ChevronUp className="absolute right-3 top-1/2 -translate-y-1/2 rotate-180 text-gray-500 pointer-events-none" size={16} />
                   </div>
                   
                   {targetGoalId && estimatedProfit > 0 && (
                       <div className="mt-3 text-xs text-purple-300 flex items-center gap-1 bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                           <CheckCircle2 size={12} />
                           Serão adicionados <b>{estimatedProfit.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</b> à meta selecionada.
                       </div>
                   )}
                </div>
            )}

            {/* MÉTRICAS */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
               
               {/* 1. KM RODADOS (TRIP) */}
               <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 flex flex-col justify-center">
                   <label className="text-gray-500 text-[9px] md:text-[10px] font-bold uppercase mb-1 block">KM Rodados (Trip)</label>
                   <div className="flex items-center gap-1.5">
                      <Map size={14} className="text-blue-500 shrink-0" />
                      <input 
                        type="number" inputMode="numeric" min="0"
                        value={distance} onChange={e => setDistance(e.target.value)} 
                        onKeyDown={preventNegativeInput}
                        className="w-full bg-transparent text-white font-bold outline-none border-b border-gray-700 focus:border-blue-500 pb-0.5 text-sm md:text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                        placeholder="0" 
                      />
                   </div>
               </div>

               {/* 2. ODÔMETRO FINAL (PAINEL) */}
               <div className="bg-gray-900/50 p-3 rounded-xl border border-emerald-500/30 flex flex-col justify-center relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 blur-md opacity-20"></div>
                   <label className="text-emerald-400 text-[9px] md:text-[10px] font-bold uppercase mb-1 block">Odômetro Final</label>
                   <div className="flex items-center gap-1.5">
                      <Navigation size={14} className="text-emerald-500 shrink-0" />
                      <input 
                        type="number" inputMode="numeric" min="0"
                        value={odometerInput} onChange={e => setOdometerInput(e.target.value)} 
                        onKeyDown={preventNegativeInput}
                        className="w-full bg-transparent text-emerald-100 font-bold outline-none border-b border-emerald-500/50 focus:border-emerald-500 pb-0.5 text-sm md:text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                        placeholder="Total" 
                      />
                   </div>
               </div>

               {/* 3. MÉDIA PAINEL */}
               <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 flex flex-col justify-center">
                   <label className="text-gray-500 text-[9px] md:text-[10px] font-bold uppercase mb-1 block">Média Painel</label>
                   <div className="flex items-center gap-1.5">
                      <Gauge size={14} className="text-orange-500 shrink-0" />
                      <input 
                        type="number" step="0.1" inputMode="decimal" min="0"
                        value={clusterAvg} onChange={e => setClusterAvg(e.target.value)} 
                        onKeyDown={preventNegativeInput}
                        className="w-full bg-transparent text-white font-bold outline-none border-b border-gray-700 focus:border-orange-500 pb-0.5 text-sm md:text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                        placeholder="km/l" 
                      />
                   </div>
               </div>

               {/* 4. HORAS */}
               <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 flex flex-col justify-center">
                   <label className="text-gray-500 text-[9px] md:text-[10px] font-bold uppercase mb-1 block">Horas</label>
                   <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-yellow-500 shrink-0" />
                      <input 
                        type="number" step="0.1" inputMode="decimal" min="0"
                        value={hours} onChange={e => setHours(e.target.value)} 
                        onKeyDown={preventNegativeInput}
                        className="w-full bg-transparent text-white font-bold outline-none border-b border-gray-700 focus:border-yellow-500 pb-0.5 text-sm md:text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                        placeholder="0.0" 
                      />
                   </div>
               </div>

               {/* 5. VIAGENS (AUTO CALCULADO SE MULTIPLE) */}
               <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 flex flex-col justify-center">
                   <label className="text-gray-500 text-[9px] md:text-[10px] font-bold uppercase mb-1 block">
                     {selectedPlatforms.length > 1 ? "Viagens (Total)" : "Viagens"}
                   </label>
                   <div className="flex items-center gap-1.5">
                      <Briefcase size={14} className="text-purple-500 shrink-0" />
                      <input 
                        type="number" inputMode="numeric" min="0"
                        readOnly={selectedPlatforms.length > 1}
                        value={trips} onChange={e => setTrips(e.target.value)} 
                        onKeyDown={preventNegativeInput}
                        className={`w-full bg-transparent text-white font-bold outline-none border-b border-gray-700 focus:border-purple-500 pb-0.5 text-sm md:text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${selectedPlatforms.length > 1 ? 'opacity-80 text-purple-200 cursor-not-allowed' : ''}`}
                        placeholder="0" 
                      />
                   </div>
               </div>

               {/* 6. OBSERVAÇÃO */}
               <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 flex flex-col justify-center">
                   <label className="text-gray-500 text-[9px] md:text-[10px] font-bold uppercase mb-1 block">Observação</label>
                   <div className="flex items-center gap-1.5">
                      <FileText size={14} className="text-gray-400 shrink-0" />
                      <input 
                        type="text"
                        value={description} onChange={e => setDescription(e.target.value)} 
                        className="w-full bg-transparent text-white font-bold outline-none border-b border-gray-700 focus:border-gray-400 pb-0.5 text-sm md:text-base" 
                        placeholder="Ex: Chuva" 
                      />
                   </div>
               </div>
            </div>

            {/* === MONITOR DE EFICIÊNCIA OPERACIONAL === */}
            {(tripKm > 0 && panelAvg > 0) && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 mb-3">
                    <h4 className="text-gray-400 text-xs font-bold uppercase flex items-center gap-2">
                        <Zap size={14} className="text-yellow-500"/> Análise da Trip (Estimada)
                    </h4>
                    {/* TOOLTIP DE AJUDA */}
                    <div className="relative group">
                        <Info size={14} className="text-gray-500 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 border border-gray-700 rounded-lg text-[10px] text-gray-300 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
                             Estimativa baseada na Trip e média do painel. A média real (bomba) está no Dashboard.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-700"></div>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center divide-x divide-gray-700">
                  
                  {/* 1. O Custo Calculado */}
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Custo Comb.</p>
                    <p className="text-red-400 font-bold text-lg">
                       {estimatedCost.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                    </p>
                    {lastFuelPrice > 0 ? (
                        <p className="text-[9px] text-gray-600">Base: R${lastFuelPrice.toFixed(2)}/un</p>
                    ) : (
                        <p className="text-[9px] text-yellow-600">Sem ref. de preço</p>
                    )}
                  </div>

                  {/* 2. O Lucro Real Aproximado */}
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Lucro Líquido</p>
                    <p className={`font-bold text-lg ${estimatedProfit > 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                       {estimatedProfit.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                    </p>
                  </div>

                  {/* 3. Eficiência (R$/km) */}
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Custo/KM</p>
                    <p className="text-yellow-500 font-bold text-lg">
                       {((estimatedCost / tripKm) || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                    </p>
                  </div>
                  
                </div>
              </div>
            )}

            <button type="submit" disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 text-base md:text-lg h-14 md:h-16">
              {saving ? "Salvando..." : <><DollarSign size={20} /> Confirmar Lançamento</>}
            </button>
          </form>
        </div>

        {/* COLUNA DIREITA: HISTÓRICO */}
        <div className="flex-1 w-full md:border-l md:border-gray-800 md:pl-8">
           <div className="mt-8 md:mt-[112px]">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-gray-400 font-bold uppercase text-sm flex items-center gap-2"><History size={16} /> Histórico Recente</h3>
                 {recentGains.length > 0 && <span className="text-[10px] text-gray-500 bg-gray-900 px-2 py-1 rounded border border-gray-800 font-mono">{recentGains.length} últimos</span>}
              </div>

              {!loading && recentGains.map(gain => {
                 const platformInfo = getPlatformDetails(gain.platform);
                 const isDeleting = deletingId === gain.id;
                 const isMultiple = gain.platform === 'MULTIPLE';
                 
                 return (
                   <div 
                     key={gain.id} 
                     onClick={() => setSelectedTransaction(gain)}
                     className="group relative bg-gray-900 border border-gray-800 hover:border-emerald-500/30 hover:bg-gray-800 p-3 rounded-xl transition-all flex items-center justify-between overflow-hidden mb-3 cursor-pointer"
                   >
                      <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 min-w-[2.5rem] rounded-xl flex items-center justify-center shadow-sm overflow-hidden relative ${isMultiple ? 'bg-indigo-600' : 'bg-white'}`}>
                           {/* Se for MULTIPLE, exibe o ícone de camadas, senão a logo normal */}
                           {isMultiple ? (
                             <Layers size={20} className="text-white"/>
                           ) : (
                             (platformInfo as any).logo ? <img src={(platformInfo as any).logo} alt={platformInfo.label} className="w-full h-full object-cover" /> : platformInfo.icon
                           )}
                         </div>
                         <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-white text-sm leading-tight group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                                {platformInfo.label}
                                <ExternalLink size={10} className="opacity-0 group-hover:opacity-50" />
                              </p>
                              {/* TAG VISUAL DE APPS ENVOLVIDOS (Mini Logos) */}
                              {isMultiple && gain.split && (
                                <div className="flex -space-x-1.5">
                                   {gain.split.map((s, idx) => {
                                      const miniLogo = ALL_PLATFORMS.find(mp => mp.id === s.platform)?.logo;
                                      if (!miniLogo) return null;
                                      return (
                                        <div key={idx} className="w-4 h-4 rounded-full bg-white border border-gray-800 overflow-hidden z-10">
                                           <img src={miniLogo} className="w-full h-full object-cover"/>
                                        </div>
                                      )
                                   })}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-0.5">
                               <span>{new Date(gain.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                               {gain.clusterKmPerLiter && gain.clusterKmPerLiter > 0 && (
                                  <span className="flex items-center gap-0.5 border-l border-gray-700 pl-2 text-orange-400 font-mono">
                                     <Gauge size={10}/> {gain.clusterKmPerLiter} km/l
                                  </span>
                               )}
                               {gain.description && (
                                 <span className="flex items-center gap-0.5 border-l border-gray-700 pl-2 text-gray-400 italic truncate max-w-[100px]">
                                     <FileText size={10}/> {gain.description}
                                 </span>
                               )}
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className="text-emerald-400 font-bold text-sm md:text-base">{formatMoney(gain.amount)}</span>
                         <button 
                           onClick={(e) => handleRequestDelete(e, gain.id)} 
                           disabled={isDeleting} 
                           className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors z-10"
                           title="Excluir"
                         >
                           <Trash2 size={16} />
                         </button>
                      </div>
                   </div>
                 );
              })}
           </div>
        </div>
      </div>
    </div>
  );
}