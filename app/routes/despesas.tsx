// app/routes/despesas.tsx

import { useEffect, useState, useCallback, useMemo } from "react";
import { 
  Fuel, Wrench, Droplets, Calendar, Trash2, MapPin, CheckCircle, 
  AlertTriangle, Pencil, X, Save, Gauge, FileText, DollarSign, 
  Flame, Zap, BatteryCharging, PlusCircle, ArrowLeft, ArrowUp,
  Car, ChevronDown, Check
} from "lucide-react";
import { supabase } from "~/lib/supabase.client";
import { ExpenseCategory, FuelType } from "~/types/enums";
import type { Vehicle, ExpenseTransaction, FuelTransaction } from "~/types/models";
import type { User } from "@supabase/supabase-js";

// === ESTILOS GLOBAIS (SCROLLBAR E INPUTS) ===
const GLOBAL_STYLES = `
  .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4b5563; }
  .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #374151 transparent; }

  /* Remover setas de input number */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }

  /* Ícones de Calendário/Relógio Brancos */
  input[type="date"], input[type="time"] { color-scheme: dark; }
  input[type="date"]::-webkit-calendar-picker-indicator,
  input[type="time"]::-webkit-calendar-picker-indicator {
    filter: invert(1) brightness(1.5);
    cursor: pointer;
    opacity: 0.8;
  }
  input[type="date"]::-webkit-calendar-picker-indicator:hover,
  input[type="time"]::-webkit-calendar-picker-indicator:hover { opacity: 1; }
`;

// === HELPER: DATA/HORA LOCAL E ISO ROBUSTO ===
const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getLocalTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Combina a data e hora digitadas criando um objeto Date no Fuso Local
const formatToISO = (dateStr: string, timeStr: string) => {
  if (!dateStr || !timeStr) return new Date().toISOString();
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const localDate = new Date(year, month - 1, day, hours, minutes);
  return localDate.toISOString();
};

// === HELPER DE UNIDADES E ÍCONES ===
const getFuelUnit = (type: FuelType) => {
  switch (type) {
    case FuelType.CNG: return 'm³';
    case FuelType.ELECTRIC: return 'kWh';
    default: return 'L';
  }
};

const getFuelLabel = (type: FuelType) => {
  switch (type) {
    case FuelType.GASOLINE: return 'Gasolina';
    case FuelType.ETHANOL: return 'Etanol';
    case FuelType.DIESEL: return 'Diesel';
    case FuelType.CNG: return 'GNV';
    case FuelType.ELECTRIC: return 'Elétrico';
    default: return type;
  }
};

const getFillLabel = (type: FuelType) => {
  if (type === FuelType.ELECTRIC) return 'Carga Completa (100%)';
  if (type === FuelType.CNG) return 'Cilindro Cheio';
  return 'Tanque Cheio';
};

const getFuelIcon = (type: FuelType, size = 18) => {
  if (type === FuelType.ELECTRIC) return <Zap size={size} />;
  if (type === FuelType.CNG) return <Flame size={size} />;
  return <Fuel size={size} />;
};

const getBrandLogo = (brand: string) => {
  if (!brand) return null;
  const normalized = brand.toLowerCase().replace(/\s+/g, '-');
  return `/logos/brands/${normalized}.png`;
};

// === COMPONENTES DE UI AUXILIARES ===

const InputField = ({ label, value, onChange, type = "number", step = "any", placeholder = "" }: any) => (
  <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700">
    <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">{label}</label>
    <input 
      type={type} 
      step={step}
      value={value} 
      onChange={onChange}
      className="w-full bg-transparent text-white font-bold outline-none border-b border-gray-600 focus:border-emerald-500 text-sm py-1"
      placeholder={placeholder}
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

// === COMPONENTES DE MODAL ===

function SuccessModal({ isOpen, onClose, title, message }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-gray-900 border border-emerald-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-400 mb-6">{message}</p>
          <button onClick={onClose} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors">
            OK, continuar
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
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
          <button onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg font-medium transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg font-medium transition-colors">Sim, excluir</button>
        </div>
      </div>
    </div>
  );
}

// === MODAL DE SELEÇÃO DE VEÍCULO ===
function VehicleSelectorModal({ isOpen, onClose, vehicles, selectedId, onSelect }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4">
      <div className="bg-gray-900 border-t sm:border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900 sticky top-0 z-10">
          <h3 className="text-lg font-bold text-white">Selecionar Veículo</h3>
          <button onClick={onClose} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar pb-10">
          {vehicles.map((v: any) => {
            const isActive = v.id === selectedId;
            return (
              <button 
                key={v.id} 
                onClick={() => { onSelect(v.id); onClose(); }}
                className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden group ${
                  isActive 
                    ? 'bg-emerald-900/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-4 relative z-10">
                  {/* Logo do Veículo */}
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center bg-white/5 p-2 ${isActive ? 'bg-emerald-500/10' : ''}`}>
                    {v.brand ? (
                        <img 
                          src={getBrandLogo(v.brand) || ''} 
                          alt={v.brand} 
                          className="w-full h-full object-contain opacity-90"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('fallback-icon');
                          }}
                        />
                    ) : null}
                    {/* Fallback Icon se a imagem falhar ou não existir */}
                    <Car size={24} className={`text-gray-400 ${v.brand ? 'hidden fallback-icon:block' : ''}`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-bold text-lg ${isActive ? 'text-white' : 'text-gray-200'}`}>
                        {v.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 text-sm mt-0.5">
                      <span className="text-emerald-400 font-mono font-medium flex items-center gap-1">
                        <Gauge size={12}/> {v.currentOdometer} km
                      </span>
                    </div>
                    {/* Placa na linha debaixo menor */}
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">
                      {v.license_plate || v.plate || "Sem Placa"}
                    </div>
                  </div>

                  {/* Tag Ativo */}
                  {isActive && (
                    <div className="absolute top-4 right-4">
                      <span className="bg-emerald-500 text-black text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-emerald-500/20">
                        <Check size={10} strokeWidth={4} /> ATIVO
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// === MODAL DE DETALHES (Input/Edit) ===
function ExpenseDetailsModal({ isOpen, onClose, transaction, onUpdate }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // Bloqueia o scroll da página principal quando o modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (transaction) {
      // CORREÇÃO: Usar os componentes locais da data para preencher os inputs
      // e evitar que o toISOString() + split converta para o dia anterior em UTC
      const txDate = new Date(transaction.date);
      setFormData({
        amount: (transaction.amount / 100).toFixed(2),
        // Monta YYYY-MM-DD localmente
        date: `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}-${String(txDate.getDate()).padStart(2, '0')}`,
        time: txDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        odometer: transaction.odometer || 0,
        liters: transaction.liters || 0,
        pricePerLiter: transaction.pricePerLiter || 0,
        stationName: transaction.stationName || "",
        description: transaction.description || "",
        category: transaction.category || "",
        fuelType: transaction.fuelType || FuelType.GASOLINE
      });
      setIsEditing(false);
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const isFuel = transaction.category === 'FUEL' || transaction.category === ExpenseCategory.FUEL;
  const unit = isFuel ? getFuelUnit(formData.fuelType) : '';

  const handleUpdateField = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = {
        amount: Math.round(parseFloat(formData.amount.replace(',', '.')) * 100),
        // CORREÇÃO: Usar helper formatToISO para garantir fuso local
        date: formatToISO(formData.date, formData.time),
        odometer: Number(formData.odometer),
      };

      if (isFuel) {
         updates.liters = Number(formData.liters);
         updates.price_per_liter = Number(formData.pricePerLiter);
         updates.station_name = formData.stationName;
      } else {
         updates.description = formData.description;
      }

      await onUpdate(transaction.id, updates);
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className={`p-6 pb-8 relative ${isFuel ? 'bg-yellow-500/10' : 'bg-blue-500/10'}`}>
           <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"><X size={20} /></button>
           <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-2xl shadow-xl flex items-center justify-center p-2 mb-4 ${isFuel ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white'}`}>
                 {isFuel ? getFuelIcon(formData.fuelType, 32) : <Wrench size={32} />}
              </div>
              <h2 className="text-2xl font-bold text-white">{isFuel ? 'Abastecimento' : 'Despesa'}</h2>
              <div className="text-sm font-medium text-gray-400 opacity-80 uppercase tracking-wider">
                 {isFuel ? getFuelLabel(formData.fuelType) : (transaction.category === 'MAINTENANCE' ? 'Manutenção' : transaction.category)}
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
           {isEditing ? (
              <div className="grid grid-cols-2 gap-3">
                 <div className="col-span-2">
                    <InputField 
                        label="Valor (R$)" 
                        value={formData.amount} 
                        onChange={(e: any) => handleUpdateField('amount', e.target.value)} 
                        step="0.01" 
                    />
                 </div>
                 
                 <div className="col-span-2 grid grid-cols-2 gap-3">
                    <InputField 
                        label="Data" 
                        value={formData.date} 
                        onChange={(e: any) => handleUpdateField('date', e.target.value)} 
                        type="date" 
                    />
                    <InputField 
                        label="Hora" 
                        value={formData.time} 
                        onChange={(e: any) => handleUpdateField('time', e.target.value)} 
                        type="time" 
                    />
                 </div>

                 <div className="col-span-2">
                    <InputField 
                        label="Odômetro (KM)" 
                        value={formData.odometer} 
                        onChange={(e: any) => handleUpdateField('odometer', e.target.value)} 
                    />
                 </div>
                 {isFuel ? (
                    <>
                       <InputField 
                           label={`Quantidade (${unit})`} 
                           value={formData.liters} 
                           onChange={(e: any) => handleUpdateField('liters', e.target.value)} 
                           step="0.001" 
                       />
                       <InputField 
                           label={`Preço / ${unit}`} 
                           value={formData.pricePerLiter} 
                           onChange={(e: any) => handleUpdateField('pricePerLiter', e.target.value)} 
                           step="0.001" 
                       />
                       <div className="col-span-2">
                           <InputField 
                               label="Nome do Posto" 
                               value={formData.stationName} 
                               onChange={(e: any) => handleUpdateField('stationName', e.target.value)} 
                               type="text" 
                           />
                       </div>
                    </>
                 ) : (
                    <div className="col-span-2">
                        <InputField 
                           label="Descrição" 
                           value={formData.description} 
                           onChange={(e: any) => handleUpdateField('description', e.target.value)} 
                           type="text" 
                        />
                    </div>
                 )}
              </div>
           ) : (
              <div className="space-y-3">
                 <div className="text-center mb-6">
                    <span className="text-4xl font-bold text-emerald-400">{(Number(formData.amount)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    <p className="text-gray-500 text-sm mt-1 flex items-center justify-center gap-1">
                       <Calendar size={12}/> {new Date(formData.date + 'T' + formData.time + ':00').toLocaleDateString('pt-BR')} - {formData.time}
                    </p>
                 </div>
                 <div className="grid grid-cols-1 gap-3">
                    <DisplayField label="Odômetro" value={`${formData.odometer ? formData.odometer + ' km' : 'Não informado'}`} icon={Gauge} color="text-emerald-500" />
                    {isFuel ? (
                       <>
                          <DisplayField label="Posto" value={formData.stationName || 'Não informado'} icon={MapPin} color="text-red-400" />
                          <div className="grid grid-cols-2 gap-3">
                             <DisplayField label={`Qtd (${unit})`} value={Number(formData.liters).toFixed(3)} icon={Droplets} color="text-blue-400" />
                             <DisplayField label={`R$ / ${unit}`} value={`R$ ${Number(formData.pricePerLiter).toFixed(2)}`} icon={DollarSign} color="text-green-400" />
                          </div>
                       </>
                    ) : (
                       <DisplayField label="Descrição" value={formData.description || formData.category} icon={FileText} color="text-gray-300" />
                    )}
                 </div>

                 {/* ID DA TRANSAÇÃO (Discreto) */}
                 <div className="mt-6 pt-4 border-t border-gray-800/50 text-center">
                    <p className="text-[10px] text-gray-600 font-mono select-all">
                      ID: {transaction.id}
                    </p>
                 </div>
              </div>
           )}
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex gap-3">
           {isEditing ? (
             <>
               <button onClick={() => setIsEditing(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition-colors">Cancelar</button>
               <button onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">{saving ? "Salvando..." : <><Save size={18}/> Salvar</>}</button>
             </>
           ) : (
             <button onClick={() => setIsEditing(true)} className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 border border-gray-700"><Pencil size={18} /> Editar</button>
           )}
        </div>
      </div>
    </div>
  );
}

// === PÁGINA PRINCIPAL ===

export default function DespesasPage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'FUEL' | 'GENERAL'>('FUEL');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Controle do Mobile First (Estado do Drawer)
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);
  
  // Controle do Seletor de Veículos
  const [isVehicleSelectorOpen, setIsVehicleSelectorOpen] = useState(false);

  // Estados de Modal
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);

  // Estados Comuns
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [amount, setAmount] = useState(""); 
  // CORREÇÃO: Inicialização de data e hora com helpers locais
  const [date, setDate] = useState(getLocalDate());
  const [time, setTime] = useState(getLocalTime());
  const [description, setDescription] = useState("");
  const [odometer, setOdometer] = useState(""); 

  // Estados Específicos de Combustível/Energia
  const [fuelType, setFuelType] = useState<FuelType>(FuelType.GASOLINE);
  const [quantity, setQuantity] = useState(""); // Litros, m³ ou kWh
  const [pricePerUnit, setPricePerUnit] = useState(""); // Preço por L, m³ ou kWh
  const [fullTank, setFullTank] = useState(true);
  const [stationName, setStationName] = useState(""); 

  // Estados Específicos Gerais
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.MAINTENANCE);

  // Memo: Veículo Selecionado Completo
  const selectedVehicle = useMemo(() => 
    vehicles.find(v => v.id === selectedVehicleId), 
  [vehicles, selectedVehicleId]);

  // Memo: Combustíveis Disponíveis para o Veículo Selecionado
  const availableFuels = useMemo(() => {
    if (!selectedVehicle || !selectedVehicle.tanks) return [FuelType.GASOLINE];
    // Extrai todos os tipos de combustível de todos os tanques e remove duplicatas
    const types = new Set<FuelType>();
    selectedVehicle.tanks.forEach(tank => {
        tank.fuelTypes.forEach(ft => types.add(ft));
    });
    return Array.from(types);
  }, [selectedVehicle]);

  // === 0. AUTENTICAÇÃO ===
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // === 1. BUSCAR VEÍCULOS E PREFERÊNCIA ===
  const fetchVehiclesAndPref = useCallback(async () => {
    if (!user) return;
    
    const { data: vData } = await supabase.from('vehicles').select('*').eq('user_id', user.id);
    if (vData) {
       // Mapeamento snake_case -> camelCase
       const mappedVehicles = vData.map(v => ({
          ...v,
          userId: v.user_id,
          currentOdometer: v.current_odometer,
          lastOdometerDate: v.last_odometer_date,
          // Garante que tanks seja um array, mesmo que venha null
          tanks: v.tanks || [] 
       }));
       setVehicles(mappedVehicles as any);

       if (mappedVehicles.length > 0 && !selectedVehicleId) {
           const { data: pData } = await supabase.from('profiles').select('last_selected_vehicle_id').eq('id', user.id).single();
           if (pData?.last_selected_vehicle_id) {
               setSelectedVehicleId(pData.last_selected_vehicle_id);
           } else {
               setSelectedVehicleId(mappedVehicles[0].id);
           }
       }
    }
  }, [user, selectedVehicleId]);

  useEffect(() => {
    if (user) {
        fetchVehiclesAndPref();
        const channel = supabase.channel('realtime-vehicles-exp')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => fetchVehiclesAndPref())
            .subscribe();
        return () => { supabase.removeChannel(channel); }
    }
  }, [user, fetchVehiclesAndPref]);

  // Resetar campos quando troca de veículo
  useEffect(() => {
    if (selectedVehicle) {
        setOdometer(String(selectedVehicle.currentOdometer || ""));
        // Se o combustível atual não for suportado pelo novo carro, muda para o primeiro disponível
        if (!availableFuels.includes(fuelType)) {
            setFuelType(availableFuels[0] || FuelType.GASOLINE);
        }
    }
  }, [selectedVehicle, availableFuels]);

  // === 2. BUSCAR HISTÓRICO COM OTIMIZAÇÃO DE REALTIME ===
  const fetchExpenses = useCallback(async (isBackgroundUpdate = false) => {
    if (!user || !selectedVehicleId) return;
    
    if (!isBackgroundUpdate) setLoading(true);

    const { data, error } = await supabase
       .from('transactions')
       .select('*')
       .eq('user_id', user.id)
       .eq('vehicle_id', selectedVehicleId)
       .eq('type', 'EXPENSE')
       .order('date', { ascending: false })
       .limit(5);

    if (!error && data) {
        const mapped = data.map(t => ({
            ...t,
            fuelType: t.fuel_type,
            stationName: t.station_name,
            pricePerLiter: t.price_per_liter,
            fullTank: t.is_full_tank,
            liters: t.liters 
        }));
        setRecentExpenses(mapped);
    }
    setLoading(false);
  }, [user, selectedVehicleId]);

  useEffect(() => {
    if (user && selectedVehicleId) {
        fetchExpenses(); 
        
        const channel = supabase.channel(`realtime-expenses-${selectedVehicleId}`)
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'transactions', filter: `vehicle_id=eq.${selectedVehicleId}` }, 
                () => fetchExpenses(true) 
            )
            .subscribe();
            
        return () => { supabase.removeChannel(channel); }
    }
  }, [user, selectedVehicleId, fetchExpenses]);

  // === CÁLCULOS ===
  const handleQuantityChange = (val: string) => {
    setQuantity(val);
    if (val && pricePerUnit) setAmount((parseFloat(val) * parseFloat(pricePerUnit)).toFixed(2));
  };
  const handlePriceChange = (val: string) => {
    setPricePerUnit(val);
    if (quantity && val) setAmount((parseFloat(quantity) * parseFloat(val)).toFixed(2));
  };
  const handleAmountChange = (val: string) => {
    setAmount(val);
    if (val && pricePerUnit) setQuantity((parseFloat(val) / parseFloat(pricePerUnit)).toFixed(3));
  };

  const preventNegativeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["-", "e"].includes(e.key)) e.preventDefault();
  };

  const formatMoney = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // === AÇÕES ===
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedVehicleId) return;
    setSaving(true);

    try {
      const safeAmount = amount.replace(',', '.');
      const amountInCents = Math.round(parseFloat(safeAmount) * 100);
      const currentOdometerValue = Number(odometer);
      
      // CORREÇÃO: Usar o helper formatToISO
      const isoDate = formatToISO(date, time);

      const baseData = {
        user_id: user.id,
        vehicle_id: selectedVehicleId,
        type: 'EXPENSE',
        amount: amountInCents,
        date: isoDate, 
        description: activeTab === 'FUEL' ? 'Abastecimento' : description,
        odometer: currentOdometerValue > 0 ? currentOdometerValue : null,
      };

      if (activeTab === 'FUEL') {
         await supabase.from('transactions').insert({
            ...baseData,
            category: ExpenseCategory.FUEL,
            fuel_type: fuelType,
            liters: Number(quantity), 
            price_per_liter: Number(pricePerUnit),
            is_full_tank: fullTank,
            station_name: stationName || "Posto/Estação não informado"
         });
      } else {
         await supabase.from('transactions').insert({ 
            ...baseData, 
            category, 
            is_fixed_cost: false 
         });
      }

      if (selectedVehicle && currentOdometerValue > (selectedVehicle.currentOdometer || 0)) {
        const updateData: any = { 
            current_odometer: currentOdometerValue,
            updated_at: new Date().toISOString()
        };
        // A data de lançamento deve ser considerada local para comparação, mas vamos simplificar
        // Se a data do lançamento é hoje ou futuro, atualizamos last_odometer_date
        const launchDate = new Date(`${date}T00:00:00`);
        const today = new Date();
        today.setHours(0,0,0,0);

        if (launchDate >= today) {
            updateData.last_odometer_date = new Date().toISOString();
        }
        await supabase.from('vehicles').update(updateData).eq('id', selectedVehicleId);
      }

      fetchExpenses(true);
      fetchVehiclesAndPref();

      setSaving(false);
      setShowSuccess(true); 
      setIsMobileFormOpen(false); 
      
      setAmount("");
      setQuantity("");
      setStationName("");
      setDescription("");

    } catch (error) {
      console.error(error);
      alert("Erro técnico ao salvar.");
      setSaving(false);
    }
  };

  const handleUpdateExpense = async (id: string, data: any) => {
      await supabase.from('transactions').update(data).eq('id', id);
      fetchExpenses(true); 
  };

  const handleDelete = async () => {
    if (deleteId) {
      await supabase.from('transactions').delete().eq('id', deleteId);
      fetchExpenses(true);
      setDeleteId(null);
    }
  };

  const handleVehicleSelect = async (newId: string) => {
    setSelectedVehicleId(newId);
    if (user) await supabase.from('profiles').update({ last_selected_vehicle_id: newId }).eq('id', user.id);
  };

  const currentUnit = getFuelUnit(fuelType);

  return (
    <div className="pb-32 pt-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <style>{GLOBAL_STYLES}</style>

      {/* HEADER DA PÁGINA */}
      <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">Minhas Despesas</h1>
          {/* Espaço para filtros futuros */}
      </div>
      
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Salvo com Sucesso!" message="O registro foi salvo e a quilometragem atualizada." />
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Excluir Despesa?" message="Essa ação não pode ser desfeita." />
      <ExpenseDetailsModal isOpen={!!selectedExpense} transaction={selectedExpense} onClose={() => setSelectedExpense(null)} onUpdate={handleUpdateExpense} />
      
      {/* Modal de Seleção de Veículo */}
      <VehicleSelectorModal 
        isOpen={isVehicleSelectorOpen} 
        onClose={() => setIsVehicleSelectorOpen(false)} 
        vehicles={vehicles}
        selectedId={selectedVehicleId}
        onSelect={handleVehicleSelect}
      />

      {/* === BOTÃO DE AÇÃO MOBILE (SÓ APARECE NO CELULAR) === */}
      <div className="lg:hidden mb-8">
         <button 
           onClick={() => setIsMobileFormOpen(true)}
           className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 active:scale-95 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-3 transition-all border border-emerald-500/20"
         >
            <div className="bg-white/20 p-1 rounded-full"><PlusCircle size={20} /></div>
            <span>Registrar Nova Despesa</span>
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === ÁREA DE INPUT (FORMULÁRIO) === */}
        <div className={`
            fixed inset-0 z-[60] bg-gray-900 overflow-y-auto transition-transform duration-500 ease-in-out
            lg:static lg:z-auto lg:bg-transparent lg:overflow-visible lg:translate-y-0 lg:col-span-1
            ${isMobileFormOpen ? 'translate-y-0' : '-translate-y-full'}
        `}>
          
          <div className="w-full min-h-full lg:h-auto lg:min-h-0 lg:sticky lg:top-4 flex flex-col">
            
            {/* HEADER DO MODO MOBILE (Botão "Cancelar lançamento" estilizado e inteiro) */}
            <div className="lg:hidden sticky top-0 z-20 bg-gray-900 border-b border-gray-800 shadow-xl">
               <button 
                 onClick={() => setIsMobileFormOpen(false)}
                 className="w-full flex items-center justify-center gap-3 p-6 text-white bg-gray-800 active:bg-gray-700 transition-colors border-b border-gray-700"
               >
                  <div className="bg-red-500/20 p-1 rounded-full text-red-400">
                    <ArrowUp size={20} /> {/* Seta para CIMA indicando que vai subir ao fechar */}
                  </div>
                  <span className="font-bold text-lg uppercase tracking-wide">Cancelar Lançamento</span>
               </button>
            </div>

            <div className="bg-gray-900 lg:rounded-xl lg:border lg:border-gray-800 lg:shadow-xl flex-1 lg:flex-none">
              
              {/* ABAS */}
              <div className="flex border-b border-gray-800 sticky top-0 lg:static bg-gray-900 z-10">
                <button onClick={() => setActiveTab('FUEL')} className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'FUEL' ? 'bg-gray-800 text-emerald-400 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                  <Fuel size={18} /> Abastecimento
                </button>
                <button onClick={() => setActiveTab('GENERAL')} className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'GENERAL' ? 'bg-gray-800 text-emerald-400 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                  <Wrench size={18} /> Manutenção
                </button>
              </div>

              <div className="p-6 pb-24 lg:pb-6">
                {vehicles.length === 0 ? (
                  <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg"><p className="text-sm text-red-400">Cadastre um veículo primeiro.</p></div>
                ) : (
                  <form onSubmit={handleSave} className="space-y-4">
                    
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide font-bold">Veículo</label>
                      {/* SUBSTUIÇÃO DO SELECT POR UM COMPONENTE CUSTOMIZADO */}
                      <button 
                        type="button"
                        onClick={() => setIsVehicleSelectorOpen(true)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-left flex items-center justify-between group hover:border-gray-600 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                           {selectedVehicle?.brand && (
                              <div className="w-8 h-8 rounded-full bg-white/5 p-1 flex items-center justify-center">
                                  <img 
                                     src={getBrandLogo(selectedVehicle.brand) || ''} 
                                     className="w-full h-full object-contain opacity-80"
                                     onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                              </div>
                           )}
                           <div className="flex flex-col">
                              <span className="text-white font-bold text-sm">{selectedVehicle?.name || 'Selecione um veículo'}</span>
                              <span className="text-emerald-500 text-xs font-mono">{selectedVehicle ? `${selectedVehicle.currentOdometer} km` : ''}</span>
                           </div>
                        </div>
                        <ChevronDown size={20} className="text-gray-500 group-hover:text-white transition-colors" />
                      </button>
                    </div>

                    {activeTab === 'FUEL' ? (
                      <>
                        <div className="mb-2">
                            <label className="block text-xs text-gray-500 mb-2 font-bold uppercase">Fonte de Energia</label>
                            <div className="flex flex-wrap gap-2">
                              {availableFuels.length === 0 ? (
                                  <p className="text-sm text-gray-500 italic">Nenhuma fonte configurada para este veículo.</p>
                              ) : availableFuels.map(f => (
                                  <button
                                    key={f}
                                    type="button"
                                    onClick={() => setFuelType(f)}
                                    className={`flex-1 min-w-[80px] py-3 rounded-xl border font-bold text-sm transition-all relative overflow-hidden flex items-center justify-center gap-1 ${
                                      fuelType === f 
                                      ? (f === FuelType.ETHANOL ? 'bg-emerald-600 border-emerald-500 text-white' 
                                        : f === FuelType.GASOLINE ? 'bg-red-600 border-red-500 text-white'
                                        : f === FuelType.CNG ? 'bg-blue-600 border-blue-500 text-white'
                                        : f === FuelType.ELECTRIC ? 'bg-yellow-500 border-yellow-400 text-black'
                                        : 'bg-yellow-600 border-yellow-500 text-white')
                                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                                    }`}
                                  >
                                      {f === FuelType.ELECTRIC && <Zap size={14}/>}
                                      {f === FuelType.CNG && <Flame size={14}/>}
                                      {getFuelLabel(f)}
                                  </button>
                              ))}
                            </div>
                        </div>

                        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 space-y-4">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><MapPin size={12} className="text-emerald-500"/> {fuelType === FuelType.ELECTRIC ? 'Estação de Recarga' : 'Posto'}</label>
                            <input value={stationName} onChange={e => setStationName(e.target.value)} placeholder={fuelType === FuelType.ELECTRIC ? "Ex: Shopping..." : "Ex: Posto Ipiranga"} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-white placeholder-gray-500 focus:border-emerald-500 outline-none transition-colors" />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-emerald-400 mb-1 font-bold">Preço / {currentUnit}</label>
                              <input type="number" step="0.001" required min="0" value={pricePerUnit} onChange={e => handlePriceChange(e.target.value)} onKeyDown={preventNegativeInput} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-white font-medium focus:border-emerald-500 outline-none" placeholder="0.00" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Total (R$)</label>
                              <input type="number" step="0.01" min="0" value={amount} onChange={e => handleAmountChange(e.target.value)} onKeyDown={preventNegativeInput} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-white font-bold text-lg focus:border-emerald-500 outline-none" placeholder="0.00" />
                            </div>
                          </div>
                          
                          <div className="relative">
                              <input type="number" step="0.001" required min="0" value={quantity} onChange={e => handleQuantityChange(e.target.value)} onKeyDown={preventNegativeInput} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-gray-300 font-mono text-sm pl-24" />
                              <span className="absolute left-3 top-2 text-xs text-gray-500 uppercase font-bold tracking-wider">Qtd ({currentUnit})</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Odômetro Total (KM)</label>
                          <input type="number" required min="0" value={odometer} onChange={e => setOdometer(e.target.value)} onKeyDown={preventNegativeInput} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white font-mono text-emerald-400 font-bold tracking-wider text-lg" />
                        </div>

                        <div className="flex items-center gap-3 py-2 bg-gray-800/30 p-2 rounded-lg cursor-pointer select-none" onClick={() => setFullTank(!fullTank)}>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${fullTank ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600'}`}>
                               {fullTank && <CheckCircle size={14} className="text-white" />}
                            </div>
                            <label className="text-sm text-gray-300 cursor-pointer">
                                {getFillLabel(fuelType)}
                            </label>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Categoria</label>
                          <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none">
                            <option value={ExpenseCategory.MAINTENANCE}>Mecânica / Peças</option>
                            <option value={ExpenseCategory.INSURANCE}>Seguro</option>
                            <option value={ExpenseCategory.TAXES}>IPVA / Licenciamento</option>
                            <option value={ExpenseCategory.CLEANING}>Lava-jato</option>
                            <option value={ExpenseCategory.FOOD}>Alimentação</option>
                            <option value={ExpenseCategory.OTHER}>Outros</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Descrição</label>
                          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Troca de Óleo" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none"/>
                        </div>

                        <div>
                            <label className="block text-xs text-emerald-500 mb-1 font-bold">Valor (R$)</label>
                            <input type="number" step="0.01" required min="0" value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={preventNegativeInput} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white text-lg outline-none" />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Odômetro (Opcional)</label>
                          <input type="number" min="0" value={odometer} onChange={e => setOdometer(e.target.value)} onKeyDown={preventNegativeInput} placeholder="KM no momento do serviço" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white font-mono placeholder-gray-600" />
                        </div>
                      </>
                    )}

                    <div className="pt-2 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Data</label>
                        <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none"/>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Hora</label>
                        <input type="time" required value={time} onChange={e => setTime(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none"/>
                      </div>
                    </div>

                    <button type="submit" disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all mt-2 transform active:scale-95">
                      {saving ? "Salvando..." : activeTab === 'FUEL' ? "Confirmar" : "Confirmar Despesa"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* === HISTÓRICO === */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <Droplets size={20} className="text-emerald-500" /> Histórico Recente
          </h2>

          <div className="space-y-3 pb-20 lg:pb-0">
            {recentExpenses.map((exp) => (
              <div key={exp.id} onClick={() => setSelectedExpense(exp)} className="group bg-gray-900 border border-gray-800 p-4 rounded-xl flex justify-between items-center hover:border-emerald-500/30 transition-all hover:bg-gray-800/50 cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center border border-opacity-10 ${exp.category === 'FUEL' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500' : 'bg-blue-500/10 text-blue-500 border-blue-500'}`}>
                    {exp.category === 'FUEL' ? getFuelIcon(exp.fuelType, 20) : <Wrench size={20}/>}
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg flex items-center gap-2">{formatMoney(exp.amount)}</p>
                    <p className="text-sm text-gray-400 capitalize flex items-center gap-2">
                      {exp.category === 'FUEL' ? (
                            <>
                                <span className="text-gray-300 font-bold bg-gray-800 px-1 rounded text-[10px] uppercase">{getFuelLabel(exp.fuelType)}</span>
                                <span className="text-gray-300 hidden sm:inline">{exp.stationName}</span>
                                <span className="text-gray-600">•</span>
                                <span>{Number(exp.liters).toFixed(1)}{getFuelUnit(exp.fuelType)}</span>
                            </>
                          ) : (exp.description || exp.category)}
                    </p>
                    {/* === ODÔMETRO NO BLOCO PRINCIPAL === */}
                    {exp.odometer && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Gauge size={12} className="text-emerald-500/70" /> 
                          {exp.odometer} km
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <span className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                        <Calendar size={12}/> 
                        {new Date(exp.date).toLocaleDateString('pt-BR')}
                        <span className="text-gray-600 ml-1 font-mono">
                           {new Date(exp.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteId(exp.id); }} className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors z-10" title="Excluir registro"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
             {recentExpenses.length === 0 && !loading && (
                <div className="p-8 border border-dashed border-gray-800 rounded-xl text-center"><p className="text-gray-500">Nenhuma despesa registrada.</p></div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}