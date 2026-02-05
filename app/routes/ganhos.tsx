// app/routes/ganhos.tsx

import { useEffect, useState, useCallback, useRef } from "react";
import { 
  Car, Clock, Map, DollarSign, Briefcase, 
  History, CheckCircle2, Zap, 
  LayoutGrid, ChevronUp, Trash2, Gauge,
  AlertTriangle, Navigation, FileText,
  Pencil, X, Save, Calendar, ExternalLink,
  Info, Target, Layers, ChevronDown, Check,
  Hash, Plus
} from "lucide-react";
import { supabase } from "~/lib/supabase.client"; 
import { Platform } from "~/types/enums"; 
import type { Vehicle, IncomeTransaction, Goal } from "~/types/models";
import type { User } from "@supabase/supabase-js";

// === ESTILOS CSS PARA SCROLLBAR MODERNA, ANIMAÇÃO SHIMMER E INPUTS NUMÉRICOS ===
const GLOBAL_STYLES = `
  .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4b5563; }
  .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #374151 transparent; }

  /* Remover setas de input number (Chrome, Safari, Edge, Opera) */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* Remover setas de input number (Firefox) */
  input[type=number] {
    -moz-appearance: textfield;
  }

  /* CORREÇÃO: Ícones de Calendário e Relógio Brancos no Modo Dark */
  input[type="date"], input[type="time"] {
    color-scheme: dark;
  }

  /* Animação de Shimmer para Skeleton */
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .animate-shimmer {
    background: linear-gradient(90deg, rgba(31, 41, 55, 0.5) 25%, rgba(55, 65, 81, 0.5) 50%, rgba(31, 41, 55, 0.5) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
`;

// === HELPER: DATA LOCAL CORRETA ===
// Corrige o bug de salvar no dia anterior (fuso horário)
const getLocalDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localDate = new Date(now.getTime() - offset);
  return localDate.toISOString().split('T')[0];
};

const getLocalTime = () => {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

// === MAPA DE LOGOS DE MARCAS ===
const BRAND_LOGOS: { [key: string]: string } = {
  'audi': '/logos/brands/audi.png',
  'bmw': '/logos/brands/bmw.png',
  'byd': '/logos/brands/byd.png',
  'caoa chery': '/logos/brands/caoa-chery.png',
  'chery': '/logos/brands/caoa-chery.png',
  'chevrolet': '/logos/brands/chevrolet.png',
  'citroen': '/logos/brands/citroen.png',
  'fiat': '/logos/brands/fiat.png',
  'ford': '/logos/brands/ford.png',
  'honda': '/logos/brands/honda.png',
  'hyundai': '/logos/brands/hyundai.png',
  'jac': '/logos/brands/jac.png',
  'jeep': '/logos/brands/jeep.png',
  'kia': '/logos/brands/kia.png',
  'land rover': '/logos/brands/land-rover.png',
  'mercedes': '/logos/brands/mercedes.png',
  'mitsubishi': '/logos/brands/mitsubishi.png',
  'nissan': '/logos/brands/nissan.png',
  'peugeot': '/logos/brands/peugeot.png',
  'renault': '/logos/brands/renault.png',
  'toyota': '/logos/brands/toyota.png',
  'volkswagen': '/logos/brands/volkswagen.png',
  'vw': '/logos/brands/volkswagen.png',
  'volvo': '/logos/brands/volvo.png',
};

// Helper para pegar a logo da marca
const getBrandLogo = (brandName: string | undefined) => {
  if (!brandName) return null;
  const key = brandName.toLowerCase().trim();
  return BRAND_LOGOS[key] || null;
};

// === TIPO LOCAL PARA SUPORTAR O SPLIT E CORRIGIR ERRO TS ===
interface IncomeTransactionWithSplit extends IncomeTransaction {
  split?: {
    platform: Platform;
    amount: number;
    trips?: number;
  }[];
  notes?: string; // Fallback para compatibilidade
  category?: string; // Adicionado para compatibilidade
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
  icon: <Layers size={32} className="text-white" />, 
  bg: 'bg-indigo-600',
  textColor: 'text-white'
};

// === HELPER: MAPPER UNIFICADO ===
// Garante que dados do Select e do Realtime (Payload) tenham o mesmo formato
const mapTransactionFromDB = (t: any): IncomeTransactionWithSplit => ({
    id: t.id,
    amount: t.amount,
    date: t.date,
    type: t.type,
    platform: t.platform,
    category: t.category || 'INCOME',
    description: t.description || t.notes || "",
    userId: t.user_id,
    vehicleId: t.vehicle_id,
     
    // Mapeamento robusto para lidar com variações de nome de coluna (snake_case do DB para camelCase da App)
    distanceDriven: Number(t.distance_driven ?? t.distance ?? 0),
    onlineDurationMinutes: Number(t.online_duration_minutes ?? t.duration ?? 0),
    tripsCount: Number(t.trips_count ?? t.trip_count ?? 0),
    clusterKmPerLiter: Number(t.cluster_km_per_liter ?? 0),
    odometer: Number(t.odometer ?? 0),
    linkedGoalId: t.linked_goal_id,
     
    notes: t.notes || t.description || "",
    split: t.split,
    createdAt: t.created_at,
    updatedAt: t.updated_at
});

// === COMPONENTES AUXILIARES ===

// --- SKELETON LOADER PARA A LISTA ---
function TransactionSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl mb-3 flex items-center justify-between">
       <div className="flex items-center gap-3 w-full">
          <div className="w-10 h-10 rounded-xl animate-shimmer flex-shrink-0"></div>
          <div className="space-y-2 w-full max-w-[150px]">
             <div className="h-3 w-3/4 rounded animate-shimmer"></div>
             <div className="h-2 w-1/2 rounded animate-shimmer"></div>
          </div>
       </div>
       <div className="h-4 w-20 rounded animate-shimmer"></div>
    </div>
  );
}

// --- COMPONENTE DE FEEDBACK ---
function FeedbackModal({ isOpen, onClose, type = 'success', title, message }: any) {
  // Lock Scroll do Body
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isSuccess = type === 'success';
  const Icon = isSuccess ? CheckCircle2 : AlertTriangle;
  const iconColor = isSuccess ? 'text-emerald-500' : 'text-red-500';
  const bgColor = isSuccess ? 'bg-emerald-500/10' : 'bg-red-500/10';
  const buttonColor = isSuccess ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
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
            className={`w-full ${buttonColor} text-white py-3 rounded-xl font-bold transition-colors mt-2 cursor-pointer`}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: any) {
  // Lock Scroll do Body
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
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
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm} 
            className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Sim, excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// === COMPONENTE INPUT REUTILIZÁVEL PARA EVITAR RERENDER ===
const ModalInputField = ({ label, field, type = "number", step="any", readOnly = false, value, onChange }: any) => (
  <div className={`bg-gray-800/50 p-2 rounded-lg border border-gray-700 ${readOnly ? 'opacity-60' : ''}`}>
    <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">{label}</label>
    <input 
      type={type} step={step} readOnly={readOnly}
      value={value} 
      onChange={e => !readOnly && onChange(field, e.target.value)}
      className={`w-full bg-transparent text-white font-bold outline-none border-b text-sm py-1 ${readOnly ? 'border-transparent cursor-not-allowed' : 'border-gray-600 focus:border-emerald-500 transition-colors'}`}
    />
  </div>
);

const ModalDisplayField = ({ label, value, icon: Icon, color = "text-gray-400" }: any) => (
  <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-800">
     <div className="flex items-center gap-2">
       {Icon && <Icon size={16} className={color} />}
       <span className="text-sm text-gray-400">{label}</span>
     </div>
     <span className="font-bold text-white text-sm">{value}</span>
  </div>
);

// === MODAL DE DETALHES E EDIÇÃO ===
function TransactionDetailsModal({ isOpen, onClose, transaction, onUpdate }: { isOpen: boolean, onClose: () => void, transaction: IncomeTransactionWithSplit | null, onUpdate: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [splitFormData, setSplitFormData] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{isOpen: boolean, type: 'success'|'error', title: string, message: string} | null>(null);

  // === NOVO: BLOQUEIO DE SCROLL DO BODY ===
  useEffect(() => {
    if (isOpen) {
      // Salva o estilo original (geralmente 'unset' ou vazio)
      const originalOverflow = document.body.style.overflow;
      // Bloqueia scroll
      document.body.style.overflow = 'hidden';
      // Restaura ao fechar/desmontar
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (transaction) {
      const txDate = new Date(transaction.date);
      setFormData({
        amount: (transaction.amount / 100).toFixed(2),
        date: txDate.toISOString().split('T')[0],
        time: txDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        distanceDriven: transaction.distanceDriven || 0,
        odometer: transaction.odometer || 0,
        clusterKmPerLiter: transaction.clusterKmPerLiter || 0,
        onlineDurationMinutes: transaction.onlineDurationMinutes ? (transaction.onlineDurationMinutes / 60).toFixed(1) : 0,
        tripsCount: transaction.tripsCount || 0,
        description: transaction.description || transaction.notes || ""
      });

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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  if (!isOpen || !transaction) return null;

  const isMultiple = (transaction.platform as string) === 'MULTIPLE';
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
        // CORREÇÃO: Usar string direta para evitar conversão automática de fuso pelo Browser
        date: new Date(`${formData.date}T${formData.time}:00`).toISOString(),
        distance: Number(formData.distanceDriven), 
        odometer: Number(formData.odometer),
        cluster_km_per_liter: Number(formData.clusterKmPerLiter), 
        duration: Math.round(Number(formData.onlineDurationMinutes) * 60), 
        trip_count: Number(formData.tripsCount), 
        notes: formData.description
      };

      if (isMultiple && splitFormData.length > 0) {
        updates.split = splitFormData.map(item => ({
            platform: item.platform,
            amount: Math.round(parseFloat(item.amount.toString().replace(',', '.')) * 100),
            trips: Number(item.trips)
        }));
      }

      // O onUpdate agora é otimista, então esperamos ele retornar (que será rápido)
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      
      {feedback && (
          <FeedbackModal 
             isOpen={feedback.isOpen} 
             type={feedback.type} 
             title={feedback.title} 
             message={feedback.message} 
             onClose={() => setFeedback(null)} 
          />
      )}

      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-5 duration-300">
        
        {/* HEADER */}
        <div className={`p-6 pb-8 relative ${platformInfo.bg}`}>
           <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors cursor-pointer">
              <X size={20} />
           </button>
           
           <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-2xl shadow-xl flex items-center justify-center p-2 mb-4 overflow-hidden ${isMultiple ? 'bg-indigo-500/50 backdrop-blur-sm border border-white/20' : 'bg-white'}`}>
                  {isMultiple ? (
                    platformInfo.icon
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
           {isEditing ? (
              <div className="grid grid-cols-2 gap-3">
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
                    <ModalInputField label={isMultiple ? "Valor Total (Calculado)" : "Valor (R$)"} field="amount" step="0.01" readOnly={isMultiple} value={formData.amount} onChange={handleInputChange} />
                 </div>
                 
                 <div className="col-span-2 grid grid-cols-2 gap-3">
                    <ModalInputField label="Data" field="date" type="date" value={formData.date} onChange={handleInputChange} />
                    <ModalInputField label="Horário Registro" field="time" type="time" value={formData.time} onChange={handleInputChange} />
                 </div>

                 <ModalInputField label="KM Trip" field="distanceDriven" value={formData.distanceDriven} onChange={handleInputChange} />
                 <ModalInputField label="Odômetro" field="odometer" value={formData.odometer} onChange={handleInputChange} />
                 <ModalInputField label="Média Painel" field="clusterKmPerLiter" step="0.1" value={formData.clusterKmPerLiter} onChange={handleInputChange} />
                 <ModalInputField label="Duração (h)" field="onlineDurationMinutes" step="0.1" value={formData.onlineDurationMinutes} onChange={handleInputChange} />
                 <ModalInputField label={isMultiple ? "Viagens Total" : "Viagens"} field="tripsCount" readOnly={isMultiple} value={formData.tripsCount} onChange={handleInputChange} />
                 <div className="col-span-2">
                   <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700">
                      <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">Observação</label>
                      <input 
                        type="text"
                        value={formData.description} 
                        onChange={e => handleInputChange('description', e.target.value)}
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
                       <Calendar size={12}/> {new Date(formData.date + 'T' + formData.time + ':00').toLocaleDateString('pt-BR')} - {formData.time}
                    </p>
                 </div>

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
                    <ModalDisplayField label="KM Trip" value={`${formData.distanceDriven} km`} icon={Map} color="text-blue-500" />
                    <ModalDisplayField label="Odômetro" value={`${formData.odometer} km`} icon={Navigation} color="text-emerald-500" />
                    <ModalDisplayField label="Média" value={`${formData.clusterKmPerLiter} km/l`} icon={Gauge} color="text-orange-500" />
                    <ModalDisplayField label="Duração" value={`${formData.onlineDurationMinutes} h`} icon={Clock} color="text-yellow-500" />
                    <ModalDisplayField label="Viagens Totais" value={formData.tripsCount} icon={Briefcase} color="text-purple-500" />
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
        <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex flex-col gap-3">
           <div className="flex gap-3">
             {isEditing ? (
               <>
                 <button 
                   onClick={() => setIsEditing(false)}
                   className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition-colors cursor-pointer"
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={handleSave}
                   disabled={saving}
                   className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                 >
                   {saving ? "Salvando..." : <><Save size={18}/> Salvar</>}
                 </button>
               </>
             ) : (
               <button 
                 onClick={() => setIsEditing(true)}
                 className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 border border-gray-700 cursor-pointer"
               >
                 <Pencil size={18} /> Editar Lançamento
               </button>
             )}
           </div>
           
           {/* ID DISCRETO NO FOOTER */}
           {!isEditing && (
             <div className="flex justify-center mt-2 opacity-30 hover:opacity-100 transition-opacity">
               <span className="text-[9px] text-gray-500 font-mono flex items-center gap-1 select-all cursor-text">
                 <Hash size={9} /> ID: {transaction.id}
               </span>
             </div>
           )}
        </div>

      </div>
    </div>
  );
}

// === PÁGINA PRINCIPAL ===

export default function GanhosPage() {
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  
  // Realtime State Otimizado
  const [recentGains, setRecentGains] = useState<IncomeTransactionWithSplit[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true); // Loading apenas inicial
  
  // Estado para controlar o formulário no mobile
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [lastFuelPrice, setLastFuelPrice] = useState(0); 
  
  const [selectedTransaction, setSelectedTransaction] = useState<IncomeTransactionWithSplit | null>(null);
  const [feedback, setFeedback] = useState<{isOpen: boolean, type: 'success'|'error', title: string, message: string} | null>(null);

  // === ESTADOS DO FORMULÁRIO ===
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]); 
  const [splitData, setSplitData] = useState<{[key: string]: { amount: string, trips: string }}>({}); 
  const [targetGoalId, setTargetGoalId] = useState("");
  
  const [amount, setAmount] = useState("");
  const [trips, setTrips] = useState("");
  
  // CORREÇÃO: Inicializar data e hora com LOCAL TIME para evitar "Dia Anterior" e "Hora Errada"
  const [date, setDate] = useState(getLocalDate());
  const [time, setTime] = useState(getLocalTime());

  const [distance, setDistance] = useState(""); 
  const [odometerInput, setOdometerInput] = useState(""); 
  const [clusterAvg, setClusterAvg] = useState(""); 
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState(""); 
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayedPlatforms = showAllPlatforms ? ALL_PLATFORMS : ALL_PLATFORMS.slice(0, 3);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsVehicleDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Auth Init
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
        if (data.user) setUser(data.user);
    });
  }, []);

  // 2. Cálculo do Split Automático
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

  const togglePlatform = (id: Platform) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(id)) {
        return prev.filter(p => p !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const updateSplitData = (platformId: string, field: 'amount' | 'trips', value: string) => {
    setSplitData(prev => ({
      ...prev,
      [platformId]: {
        ...prev[platformId],
        [field]: value
      }
    }));
  };

  // 3. Carregar Veículos (Realtime)
  const fetchVehiclesAndPref = useCallback(async () => {
    if (!user) return;
    const { data: vData } = await supabase.from('vehicles').select('*').eq('user_id', user.id);
    if (vData) {
       const mappedVehicles = vData.map(v => ({
         ...v,
         userId: v.user_id,
         licensePlate: v.license_plate, 
         currentOdometer: v.current_odometer, 
         lastOdometerDate: v.last_odometer_date, 
         isDefault: v.is_default 
       }));
       setVehicles(mappedVehicles as any);

       if (!selectedVehicle) {
            const { data: pData } = await supabase.from('profiles').select('last_selected_vehicle_id').eq('id', user.id).single();
            if (pData?.last_selected_vehicle_id) {
                setSelectedVehicle(pData.last_selected_vehicle_id);
            } else if (mappedVehicles.length > 0) {
                setSelectedVehicle(mappedVehicles[0].id);
            }
       }
    }
 }, [user, selectedVehicle]);

 useEffect(() => {
   if (user) {
       fetchVehiclesAndPref();
       const channel = supabase.channel('realtime-vehicles')
           .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
               fetchVehiclesAndPref();
           })
           .subscribe();

       return () => { supabase.removeChannel(channel); }
   }
 }, [user, fetchVehiclesAndPref]);

  // 4. Carregar Metas (Realtime)
  const fetchGoals = useCallback(async () => {
      if (!user) return;
      const { data, error } = await supabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'ACTIVE');
      if (!error && data) {
          const mappedGoals = data.map(g => ({ 
              ...g, 
              userId: g.user_id,
              targetAmount: g.target_amount, 
              currentAmount: g.current_amount, 
              linkedVehicleIds: g.linked_vehicle_ids 
          }));
          setActiveGoals(mappedGoals as any);
      }
  }, [user]);

  useEffect(() => {
    if (user) {
        fetchGoals();
        const channel = supabase.channel('realtime-goals')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, () => fetchGoals())
            .subscribe();
        return () => { supabase.removeChannel(channel); }
    }
  }, [user, fetchGoals]);

  // === 5. CORE REALTIME LOGIC PARA TRANSAÇÕES (Otimizado com State Management Reativo) ===
  useEffect(() => {
    if (!user || !selectedVehicle) return;

    // Apenas na primeira vez mostramos o skeleton
    setIsLoadingInitial(true);

    const loadInitialData = async () => {
        const { data, error } = await supabase
           .from('transactions')
           .select('*')
           .eq('user_id', user.id)
           .eq('vehicle_id', selectedVehicle)
           .eq('type', 'INCOME')
           .order('date', { ascending: false })
           .limit(10);
        
        if (!error && data) {
           setRecentGains(data.map(mapTransactionFromDB));
        }
        setIsLoadingInitial(false);
    };

    loadInitialData();

    // Inscrição Realtime "Cirúrgica"
    const channel = supabase.channel(`realtime-gains-${selectedVehicle}`)
       .on(
         'postgres_changes', 
         { event: '*', schema: 'public', table: 'transactions', filter: `vehicle_id=eq.${selectedVehicle}` }, 
         (payload) => {
             // 1. INSERT: Adiciona no topo se for INCOME
             if (payload.eventType === 'INSERT' && payload.new.type === 'INCOME') {
                 const newTx = mapTransactionFromDB(payload.new);
                 setRecentGains(prev => {
                     // DEDUPLICAÇÃO: Se já adicionamos manualmente no handleSave, não adiciona de novo
                     if (prev.some(item => item.id === newTx.id)) return prev;
                     // ADICIONA E REORDENA POR DATA
                     return [newTx, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                 });
             } 
             // 2. DELETE: Remove da lista
             else if (payload.eventType === 'DELETE') {
                 setRecentGains(prev => prev.filter(item => item.id !== payload.old.id));
             }
             // 3. UPDATE: Atualiza o item na lista E REORDENA
             else if (payload.eventType === 'UPDATE' && payload.new.type === 'INCOME') {
                 setRecentGains(prev => 
                    prev.map(item => item.id === payload.new.id ? mapTransactionFromDB(payload.new) : item)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                 );
             }
         }
       )
       .subscribe();

    return () => { supabase.removeChannel(channel); }

  }, [user, selectedVehicle]);


  // 6. Lógica Auxiliar
  useEffect(() => {
    if (!selectedVehicle) return;
    
    const fetchLastPrice = async () => {
      const { data } = await supabase.from('transactions')
        .select('price_per_liter')
        .eq('vehicle_id', selectedVehicle)
        .eq('category', 'FUEL') 
        .gt('price_per_liter', 0)
        .order('date', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setLastFuelPrice(Number(data[0].price_per_liter) || 0);
      } else {
        setLastFuelPrice(0);
      }
    };
    fetchLastPrice();

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedVehicle) return;
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

      // CORREÇÃO: Combinar a data e hora local do input e converter para ISO sem alterar o dia
      const transactionData: any = {
        user_id: user.id,
        vehicle_id: selectedVehicle,
        type: 'INCOME',
        platform: finalPlatform,
        amount: amountCents,
        date: new Date(`${date}T${time}:00`).toISOString(),
        
        // Mapeamento correto para colunas existentes (ou que devem existir)
        distance: drivenKm,  // Mudei de distance_driven para distance (padrão anterior)
        duration: Math.round(hoursNum * 60), // Mudei de online_duration_minutes para duration
        trip_count: tripsNum, // Mudei de trips_count para trip_count
        notes: description, // Mudei de description para notes
        
        // Colunas Novas (Precisam ser criadas no DB)
        cluster_km_per_liter: avgNum,
        split: finalSplit ? finalSplit : undefined, 
        
        odometer: finalOdometer, 
        linked_goal_id: targetGoalId || null
      };

      // MELHORIA DE FLUIDEZ: Inserir e selecionar o dado retornado na mesma chamada
      const { data: insertedData, error: txError } = await supabase
          .from('transactions')
          .insert(transactionData)
          .select()
          .single();

      if (txError) throw txError;

      // ATUALIZAÇÃO OTIMISTA: Atualiza o estado imediatamente com o dado retornado E REORDENA
      if (insertedData) {
          const newTransaction = mapTransactionFromDB(insertedData);
          setRecentGains(prev => 
             [newTransaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          );
      }

      // Atualizações paralelas (não bloqueiam o fluxo principal visual - Fire and Forget)
      const promises = [];

      if (finalOdometer > startOdometer) {
         // Atualiza LOCALMENTE os veículos para refletir o odômetro na hora
         setVehicles(prev => prev.map(v => 
            v.id === selectedVehicle 
              ? { ...v, currentOdometer: finalOdometer } 
              : v
         ));

         promises.push(supabase.from('vehicles').update({
            current_odometer: finalOdometer,
            last_odometer_date: new Date(`${date}T12:00:00`).toISOString(),
            updated_at: new Date().toISOString()
         }).eq('id', selectedVehicle));
      }

      if (targetGoalId && estimatedProfit > 0) {
          const goal = activeGoals.find(g => g.id === targetGoalId);
          if (goal) {
              promises.push(supabase.from('goals').update({
                  current_amount: goal.currentAmount + estimatedProfit
              }).eq('id', targetGoalId));
          }
      }
      
      // Executa as promessas secundárias em segundo plano
      Promise.all(promises).catch(console.error);

      if (targetGoalId && estimatedProfit > 0) {
          setFeedback({
            isOpen: true,
            type: 'success',
            title: 'Meta Atualizada!',
            message: `Sucesso! ${estimatedProfit.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} foram destinados para a meta! 🎯`
          });
      } else {
        setFeedback({
            isOpen: true,
            type: 'success',
            title: 'Sucesso!',
            message: 'Ganho registrado com sucesso.'
        });
      }

      // Limpa formulário
      setAmount("");
      setDistance("");
      // AQUI A MUDANÇA: Atualiza o odômetro para o NOVO valor, ao invés de limpar
      setOdometerInput(String(finalOdometer)); 
      setHours("");
      setTrips("");
      setClusterAvg(""); 
      setDescription(""); 
      setTargetGoalId(""); 
      setSelectedPlatforms([]);
      setSplitData({});
      
      setIsMobileFormOpen(false); // Fecha o formulário no mobile após salvar
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

  // === OTIMIZAÇÃO: EDIÇÃO OTIMISTA (INSTANTÂNEA) ===
  const handleUpdateTransaction = async (id: string, updates: any) => {
      // 1. Snapshot do estado anterior
      const previousGains = [...recentGains];
      const existingItem = recentGains.find(g => g.id === id);
      
      if (!existingItem) return;

      // 2. Determinar o novo objeto para UI imediata (Mapeia chaves do DB para UI)
      const optimisticItem: IncomeTransactionWithSplit = {
        ...existingItem,
        amount: updates.amount,
        date: updates.date,
        distanceDriven: updates.distance,
        odometer: updates.odometer,
        clusterKmPerLiter: updates.cluster_km_per_liter,
        onlineDurationMinutes: updates.duration ? updates.duration / 60 : existingItem.onlineDurationMinutes,
        tripsCount: updates.trip_count,
        description: updates.notes,
        // Se tiver split
        split: updates.split || existingItem.split
      };

      // 3. Atualizar UI imediatamente E REORDENAR (Caso a data mude)
      setRecentGains(prev => 
        prev.map(item => item.id === id ? optimisticItem : item)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
      setSelectedTransaction(optimisticItem); // Atualiza modal se estiver aberto

      try {
        // 4. Envia para o servidor em segundo plano
        const { error } = await supabase.from('transactions').update(updates).eq('id', id);
        
        if (error) throw error;
        
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Atualizado',
          message: 'Lançamento atualizado com sucesso.'
        });

      } catch (error) {
        console.error(error);
        
        // 5. ROLLBACK: Reverte o estado se der erro
        setRecentGains(previousGains);
        setSelectedTransaction(existingItem);
        
        setFeedback({
          isOpen: true,
          type: 'error',
          title: 'Erro ao Atualizar',
          message: 'Falha ao salvar alterações. Os dados foram restaurados.'
        });
      }
  };

  const handleRequestDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setItemToDelete(id);
  };

  // === OTIMIZAÇÃO: EXCLUSÃO OTIMISTA (INSTANTÂNEA) ===
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    const idToDelete = itemToDelete;
    
    // 1. BACKUP: Guarda o estado atual caso precise reverter
    const previousGains = [...recentGains];

    // 2. OTIMISMO: Remove da tela IMEDIATAMENTE (Sensação de Instantâneo)
    setRecentGains(prev => prev.filter(item => item.id !== idToDelete));
    
    // Fecha o modal imediatamente
    setDeletingId(idToDelete); 
    setItemToDelete(null);

    try { 
      // 3. ENVIA: Manda para o servidor em segundo plano
      const { error } = await supabase.from('transactions').delete().eq('id', idToDelete); 
      
      if (error) throw error;
      
      // Sucesso: Feedback visual para o usuário
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Excluído',
        message: 'Registro removido com sucesso.'
      });

    } catch (e) { 
      console.error(e); 
      
      // 4. ROLLBACK: Se der erro, volta o item para a lista
      setRecentGains(previousGains);
      
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Excluir',
        message: 'Não foi possível excluir o registro. Ele foi restaurado.'
      });
    } finally { 
      setDeletingId(null); 
    }
  };

  const formatMoney = (val: number) => (val / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatMoneyFloat = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  
  const getPlatformDetails = (id: string) => {
    if (id === 'MULTIPLE') return MULTIPLE_PLATFORM_CONFIG;
    return ALL_PLATFORMS.find(p => p.id === id) || ALL_PLATFORMS[5];
  };

  // Encontra o veículo selecionado para exibir no dropdown customizado
  const activeVehicle = vehicles.find(v => v.id === selectedVehicle);

  return (
    <div className="pb-32 pt-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <style>{GLOBAL_STYLES}</style>

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
          
          {/* --- NOVO: CABEÇALHO MOBILE + BOTÃO DE TOGGLE --- */}
          <div className="md:hidden mb-6">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-4">
                <Zap className="text-yellow-500 fill-yellow-500" size={28} /> Ganhos
              </h1>
              
              <button 
                onClick={() => setIsMobileFormOpen(!isMobileFormOpen)}
                className={`w-full p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group active:scale-[0.98] shadow-lg ${
                  isMobileFormOpen 
                    ? 'bg-gray-800 border-gray-700 text-gray-300' 
                    : 'bg-emerald-600 border-emerald-500 text-white'
                }`}
              >
                 <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full transition-colors ${isMobileFormOpen ? 'bg-gray-700' : 'bg-white/20'}`}>
                       {isMobileFormOpen ? <X size={20} /> : <Plus size={20} />}
                    </div>
                    <div className="text-left">
                       <span className="font-bold text-base block">
                          {isMobileFormOpen ? "Cancelar Lançamento" : "Adicionar Novo Ganho"}
                       </span>
                       {!isMobileFormOpen && <span className="text-xs opacity-90 font-medium">Toque para abrir o formulário</span>}
                    </div>
                 </div>
                 <ChevronDown size={20} className={`transition-transform duration-300 ${isMobileFormOpen ? 'rotate-180' : ''}`}/>
              </button>
          </div>

          {/* --- WRAPPER ANIMADO (ACORDEÃO NO MOBILE) --- */}
          <div className={`
              transform transition-all duration-500 ease-in-out overflow-hidden
              ${isMobileFormOpen ? 'max-h-[3000px] opacity-100 translate-y-0 mb-8' : 'max-h-0 opacity-0 -translate-y-4 md:max-h-none md:opacity-100 md:translate-y-0 md:mb-0 md:overflow-visible'}
          `}>

              <header className="mb-6 md:h-[88px] flex-col justify-center hidden md:flex">
                <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                  <Zap className="text-yellow-500 fill-yellow-500" size={28} /> Registrar Ganho
                </h1>
                <p className="text-gray-400 text-sm md:text-base">Selecione o(s) app(s) e lance o faturamento.</p>
              </header>

              <form onSubmit={handleSave} className="space-y-6 md:space-y-8">
                  
                 <div className="bg-gray-900/50 p-3 md:p-4 rounded-xl border border-gray-800 transition-colors relative z-20">
                   <label className="text-gray-400 text-xs font-bold uppercase mb-2 block tracking-wider">Veículo</label>
                   
                   {/* DROPDOWN CUSTOMIZADO DE VEÍCULOS */}
                   <div className="relative" ref={dropdownRef}>
                      <button 
                        type="button"
                        onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 flex items-center justify-between hover:bg-gray-700/80 transition-colors focus:ring-2 focus:ring-emerald-500 outline-none h-14"
                      >
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center p-1 border border-gray-600 overflow-hidden">
                                {activeVehicle ? (
                                  getBrandLogo(activeVehicle.brand) ? (
                                    <img src={getBrandLogo(activeVehicle.brand)!} alt={activeVehicle.brand} className="w-full h-full object-contain" />
                                  ) : <Car size={16} className="text-gray-400"/>
                                ) : <Car size={16} className="text-gray-400"/>}
                             </div>
                             <div className="flex flex-col items-start">
                                <span className="font-bold text-sm leading-tight">{activeVehicle?.name || 'Selecione um veículo'}</span>
                                {activeVehicle && <span className="text-[10px] text-gray-400 leading-tight uppercase">{activeVehicle.licensePlate}</span>}
                             </div>
                          </div>
                          <ChevronDown size={18} className={`text-gray-400 transition-transform ${isVehicleDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isVehicleDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 max-h-60 overflow-y-auto custom-scrollbar">
                           {vehicles.map(v => {
                              const isSelected = selectedVehicle === v.id;
                              const logo = getBrandLogo(v.brand);
                              return (
                                <button
                                   key={v.id}
                                   type="button"
                                   onClick={async () => {
                                      setSelectedVehicle(v.id);
                                      setIsVehicleDropdownOpen(false);
                                      if (user) {
                                          await supabase.from('profiles').update({ last_selected_vehicle_id: v.id }).eq('id', user.id);
                                      }
                                   }}
                                   className={`w-full p-3 flex items-center justify-between border-b border-gray-800 last:border-0 transition-colors ${isSelected ? 'bg-emerald-500/10 hover:bg-emerald-500/20' : 'hover:bg-gray-800'}`}
                                >
                                   <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center p-1 border overflow-hidden ${isSelected ? 'bg-emerald-500/20 border-emerald-500' : 'bg-gray-800 border-gray-700'}`}>
                                          {logo ? <img src={logo} className="w-full h-full object-contain" /> : <Car size={14} className={isSelected ? 'text-emerald-400' : 'text-gray-500'}/>}
                                      </div>
                                      <div className="text-left">
                                         <div className={`text-sm font-bold ${isSelected ? 'text-emerald-400' : 'text-white'}`}>{v.name}</div>
                                         <div className="text-[10px] text-gray-500 uppercase">{v.brand} • {v.licensePlate}</div>
                                      </div>
                                   </div>
                                   {isSelected && (
                                     <div className="flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg shadow-emerald-500/20">
                                        <Check size={10} /> Ativo
                                     </div>
                                   )}
                                </button>
                              )
                           })}
                        </div>
                      )}
                   </div>
                </div>

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
                              className={`relative h-28 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center gap-2 group overflow-hidden active:scale-95 cursor-pointer ${isSelected ? `${p.bg} ${p.textColor} border-transparent shadow-lg ring-2 ring-white/30` : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'}`}
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
                        <button type="button" onClick={() => setShowAllPlatforms(true)} className="h-28 rounded-2xl border border-gray-800 bg-gray-900/50 hover:bg-gray-800 text-gray-400 hover:text-white transition-all flex flex-col items-center justify-center gap-2 group active:scale-95 cursor-pointer">
                          <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center group-hover:bg-gray-700"><LayoutGrid size={20} /></div>
                          <span className="font-bold text-sm">Ver Mais</span>
                        </button>
                      )}
                      {showAllPlatforms && (
                        <button type="button" onClick={() => setShowAllPlatforms(false)} className="h-28 rounded-2xl border border-dashed border-gray-700 bg-transparent text-gray-500 hover:text-white hover:border-gray-500 transition-all flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer">
                          <ChevronUp size={24} /><span className="text-xs font-medium">Recolher</span>
                        </button>
                      )}
                   </div>
                </div>

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
                              readOnly={selectedPlatforms.length > 1}
                              value={amount} onChange={e => setAmount(e.target.value)} 
                              onKeyDown={preventNegativeInput}
                              className={`w-full bg-gray-950 border border-emerald-500/30 rounded-xl py-4 pl-12 md:pl-14 text-white text-2xl md:text-3xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none placeholder-emerald-900/30 h-16 md:h-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${selectedPlatforms.length > 1 ? 'opacity-80 cursor-not-allowed text-emerald-200' : ''}`}
                              placeholder="0,00" 
                            />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 md:col-span-2">
                          <div>
                              <label className="text-gray-500 text-xs font-bold uppercase mb-2 block tracking-wider">Data</label>
                              <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 md:p-4 text-white focus:border-emerald-500 outline-none h-12 md:h-14"/>
                          </div>
                          <div>
                              <label className="text-gray-500 text-xs font-bold uppercase mb-2 block tracking-wider">Horário Registro</label>
                              <input type="time" required value={time} onChange={e => setTime(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 md:p-4 text-white focus:border-emerald-500 outline-none h-12 md:h-14"/>
                          </div>
                      </div>
                   </div>
                </div>

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

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                   
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

                   <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 flex flex-col justify-center">
                       <label className="text-gray-500 text-[9px] md:text-[10px] font-bold uppercase mb-1 block">Duração (h)</label>
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

                {(tripKm > 0 && panelAvg > 0) && (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-3">
                        <h4 className="text-gray-400 text-xs font-bold uppercase flex items-center gap-2">
                            <Zap size={14} className="text-yellow-500"/> Análise da Trip (Estimada)
                        </h4>
                        <div className="relative group">
                            <Info size={14} className="text-gray-500 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 border border-gray-700 rounded-lg text-[10px] text-gray-300 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
                                 Estimativa baseada na Trip e média do painel. A média real (bomba) está no Dashboard.
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-700"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-center divide-x divide-gray-700">
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

                      <div>
                        <p className="text-[10px] text-gray-500 uppercase">Lucro Líquido</p>
                        <p className={`font-bold text-lg ${estimatedProfit > 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                           {estimatedProfit.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] text-gray-500 uppercase">Custo/KM</p>
                        <p className="text-yellow-500 font-bold text-lg">
                           {((estimatedCost / tripKm) || 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 text-base md:text-lg h-14 md:h-16 cursor-pointer">
                  {saving ? "Salvando..." : <><DollarSign size={20} /> Confirmar Lançamento</>}
                </button>
              </form>

          </div>
        </div>

        <div className="flex-1 w-full md:border-l md:border-gray-800 md:pl-8">
           <div className="mt-8 md:mt-[112px]">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-gray-400 font-bold uppercase text-sm flex items-center gap-2"><History size={16} /> Histórico Recente</h3>
                 {!isLoadingInitial && recentGains.length > 0 && <span className="text-[10px] text-gray-500 bg-gray-900 px-2 py-1 rounded border border-gray-800 font-mono">{recentGains.length} últimos</span>}
              </div>

              {isLoadingInitial && Array.from({length: 5}).map((_, i) => <TransactionSkeleton key={i} />)}

              {!isLoadingInitial && recentGains.map(gain => {
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
                                
                                <span className="text-emerald-500/80 font-mono text-[10px] bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
                                   {new Date(gain.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>

                                {gain.clusterKmPerLiter && gain.clusterKmPerLiter > 0 && (
                                   <span className="flex items-center gap-0.5 border-l border-gray-700 pl-2 text-orange-400 font-mono">
                                      <Gauge size={10}/> {gain.clusterKmPerLiter} km/l
                                   </span>
                                )}
                                {gain.notes && (
                                   <span className="flex items-center gap-0.5 border-l border-gray-700 pl-2 text-gray-400 italic truncate max-w-[100px]">
                                           <FileText size={10}/> {gain.notes}
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