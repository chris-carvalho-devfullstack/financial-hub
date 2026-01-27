// app/routes/despesas.tsx

import { useEffect, useState } from "react";
import { 
  collection, addDoc, query, where, orderBy, limit, onSnapshot, 
  updateDoc, doc, deleteDoc, setDoc // <--- ADICIONADO setDoc
} from "firebase/firestore";
import { 
  Fuel, Wrench, Droplets, Calendar, Trash2, MapPin, CheckCircle, 
  AlertTriangle, Pencil, X, Save, Gauge, FileText, ExternalLink, DollarSign, 
  Flame, Zap, Info
} from "lucide-react";
import { db, auth } from "~/lib/firebase.client";
import { ExpenseCategory, FuelType, TankType } from "~/types/enums";
import type { Vehicle } from "~/types/models";

// === COMPONENTES DE MODAL (MANTIDOS IGUAIS) ===

function SuccessModal({ isOpen, onClose, title, message }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-emerald-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl transform transition-all scale-100">
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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

// === NOVO MODAL DE DETALHES (ATUALIZADO PARA SUPORTAR NOVOS COMBUSTÍVEIS) ===
function ExpenseDetailsModal({ isOpen, onClose, transaction, onUpdate }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      setFormData({
        amount: (transaction.amount / 100).toFixed(2),
        date: new Date(transaction.date).toLocaleDateString('en-CA'),
        odometer: transaction.odometer || 0,
        liters: transaction.liters || 0,
        pricePerLiter: transaction.pricePerLiter || 0,
        stationName: transaction.stationName || "",
        description: transaction.description || "",
        category: transaction.category || "",
        fuelType: transaction.fuelType || FuelType.GASOLINE // Novo campo
      });
      setIsEditing(false);
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const isFuel = transaction.category === 'FUEL' || transaction.category === ExpenseCategory.FUEL;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = {
        amount: Math.round(parseFloat(formData.amount.replace(',', '.')) * 100),
        date: new Date(`${formData.date}T00:00:00`).toISOString(),
        odometer: Number(formData.odometer),
      };

      if (isFuel) {
         updates.liters = Number(formData.liters);
         updates.pricePerLiter = Number(formData.pricePerLiter);
         updates.stationName = formData.stationName;
         // updates.fuelType = formData.fuelType; // Opcional: permitir trocar combustível na edição
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

  const InputField = ({ label, field, type = "number", step="any", placeholder="" }: any) => (
    <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700">
      <label className="text-[10px] uppercase text-gray-500 font-bold block mb-1">{label}</label>
      <input 
        type={type} step={step}
        value={formData[field]} onChange={e => setFormData({...formData, [field]: e.target.value})}
        className="w-full bg-transparent text-white font-bold outline-none border-b border-gray-600 focus:border-emerald-500 text-sm py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className={`p-6 pb-8 relative ${isFuel ? 'bg-yellow-500/10' : 'bg-blue-500/10'}`}>
           <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"><X size={20} /></button>
           <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-2xl shadow-xl flex items-center justify-center p-2 mb-4 ${isFuel ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white'}`}>
                 {isFuel ? <Fuel size={32} /> : <Wrench size={32} />}
              </div>
              <h2 className="text-2xl font-bold text-white">{isFuel ? 'Abastecimento' : 'Despesa'}</h2>
              <div className="text-sm font-medium text-gray-400 opacity-80 uppercase tracking-wider">
                 {isFuel ? (transaction.fuelType || 'Combustível') : (transaction.category === 'MAINTENANCE' ? 'Manutenção' : transaction.category)}
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
           {isEditing ? (
              <div className="grid grid-cols-2 gap-3">
                 <div className="col-span-2"><InputField label="Valor (R$)" field="amount" step="0.01" /></div>
                 <div className="col-span-2"><InputField label="Data" field="date" type="date" /></div>
                 <div className="col-span-2"><InputField label="Odômetro (KM)" field="odometer" /></div>
                 {isFuel ? (
                    <>
                       <InputField label="Quantidade" field="liters" step="0.001" />
                       <InputField label="Preço Unitário" field="pricePerLiter" step="0.001" />
                       <div className="col-span-2"><InputField label="Nome do Posto" field="stationName" type="text" /></div>
                    </>
                 ) : (
                    <div className="col-span-2"><InputField label="Descrição" field="description" type="text" /></div>
                 )}
              </div>
           ) : (
              <div className="space-y-3">
                 <div className="text-center mb-6">
                    <span className="text-4xl font-bold text-emerald-400">{(Number(formData.amount)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    <p className="text-gray-500 text-sm mt-1 flex items-center justify-center gap-1"><Calendar size={12}/> {new Date(formData.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                 </div>
                 <div className="grid grid-cols-1 gap-3">
                    <DisplayField label="Odômetro" value={`${formData.odometer ? formData.odometer + ' km' : 'Não informado'}`} icon={Gauge} color="text-emerald-500" />
                    {isFuel ? (
                       <>
                          <DisplayField label="Posto" value={formData.stationName} icon={MapPin} color="text-red-400" />
                          <div className="grid grid-cols-2 gap-3">
                             <DisplayField label="Qtd." value={`${Number(formData.liters).toFixed(3)} ${transaction.fuelType === FuelType.CNG ? 'm³' : transaction.fuelType === FuelType.ELECTRIC ? 'kWh' : 'L'}`} icon={Droplets} color="text-blue-400" />
                             <DisplayField label="Unitário" value={`R$ ${Number(formData.pricePerLiter).toFixed(2)}`} icon={DollarSign} color="text-green-400" />
                          </div>
                       </>
                    ) : (
                       <DisplayField label="Descrição" value={formData.description || formData.category} icon={FileText} color="text-gray-300" />
                    )}
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
  const [activeTab, setActiveTab] = useState<'FUEL' | 'GENERAL'>('FUEL');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados de Modal
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);

  // Estados Comuns
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [amount, setAmount] = useState(""); 
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [description, setDescription] = useState("");
  const [odometer, setOdometer] = useState(""); 

  // Estados Específicos de Combustível
  const [fuelType, setFuelType] = useState<FuelType>(FuelType.GASOLINE);
  const [liters, setLiters] = useState("");
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [fullTank, setFullTank] = useState(true);
  const [stationName, setStationName] = useState(""); 

  // Estados Específicos Gerais
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.MAINTENANCE);

  // Helpers de Unidade
  const getUnit = () => {
      if (fuelType === FuelType.CNG) return 'm³';
      if (fuelType === FuelType.ELECTRIC) return 'kWh';
      return 'Litros';
  };

  const translateFuel = (f: FuelType) => {
      switch (f) {
          case FuelType.GASOLINE: return "Gasolina";
          case FuelType.ETHANOL: return "Etanol";
          case FuelType.DIESEL: return "Diesel";
          case FuelType.CNG: return "GNV";
          case FuelType.ELECTRIC: return "Elétrico";
          default: return f;
      }
  };

  // === 1. BUSCAR VEÍCULOS E PREFERÊNCIA DO USUÁRIO ===
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        // A. Veículos
        const qVehicles = query(collection(db, "vehicles"), where("userId", "==", user.uid));
        const unsubVehicles = onSnapshot(qVehicles, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Vehicle[];
          setVehicles(data);
          
          if (data.length > 0 && !selectedVehicle) {
            setSelectedVehicle(data[0].id);
            if (data[0].currentOdometer) setOdometer(String(data[0].currentOdometer));
            
            // Seleciona o primeiro combustível do primeiro tanque como padrão
            if (data[0].tanks && data[0].tanks.length > 0) {
                setFuelType(data[0].tanks[0].fuelTypes[0]);
            }
          }
        });

        // B. Preferência do Usuário (PERSISTÊNCIA)
        const userRef = doc(db, "users", user.uid);
        const unsubUser = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data();
                if (userData.lastSelectedVehicleId) {
                    setSelectedVehicle(userData.lastSelectedVehicleId);
                }
            }
        });

        return () => {
            unsubVehicles();
            unsubUser();
        };
      }
    });
    return () => unsubAuth && unsubAuth();
  }, []);

  // === 2. BUSCAR HISTÓRICO DE DESPESAS DO VEÍCULO SELECIONADO ===
  useEffect(() => {
    if (!auth.currentUser || !selectedVehicle) return;
    
    setLoading(true);
    const qExpenses = query(
      collection(db, "transactions"), 
      where("userId", "==", auth.currentUser.uid),
      where("vehicleId", "==", selectedVehicle), // <--- FILTRO ADICIONADO
      where("type", "==", "EXPENSE"),
      orderBy("date", "desc"),
      limit(5)
    );

    const unsubExpenses = onSnapshot(qExpenses, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRecentExpenses(data);
      setLoading(false);
    }, (err) => console.error(err));

    return () => unsubExpenses();
  }, [selectedVehicle]); // <--- Dependência adicionada

  // Atualiza odômetro e combustível ao trocar veículo
  useEffect(() => {
    const vehicle = vehicles.find(v => v.id === selectedVehicle);
    if (vehicle) {
        setOdometer(String(vehicle.currentOdometer || ""));
        // Reseta o tipo de combustível para o primeiro disponível no carro novo
        if (vehicle.tanks && vehicle.tanks.length > 0) {
            setFuelType(vehicle.tanks[0].fuelTypes[0]);
        }
    }
  }, [selectedVehicle, vehicles]);

  const preventNegativeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["-", "e"].includes(e.key)) e.preventDefault();
  };

  // === CÁLCULOS ===
  const handleLitersChange = (val: string) => {
    setLiters(val);
    if (val && pricePerLiter) setAmount((parseFloat(val) * parseFloat(pricePerLiter)).toFixed(2));
  };
  const handlePriceChange = (val: string) => {
    setPricePerLiter(val);
    if (liters && val) setAmount((parseFloat(liters) * parseFloat(val)).toFixed(2));
  };
  const handleAmountChange = (val: string) => {
    setAmount(val);
    if (val && pricePerLiter) setLiters((parseFloat(val) / parseFloat(pricePerLiter)).toFixed(3));
  };

  // === AÇÕES ===
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !selectedVehicle) return;
    setSaving(true);

    try {
      const safeAmount = amount.replace(',', '.');
      const amountInCents = Math.round(parseFloat(safeAmount) * 100);
      const currentOdometerValue = Number(odometer);
      
      const baseData = {
        userId: auth.currentUser.uid,
        vehicleId: selectedVehicle,
        type: 'EXPENSE',
        amount: amountInCents,
        date: new Date(`${date}T00:00:00`).toISOString(),
        description: activeTab === 'FUEL' ? 'Abastecimento' : description,
        odometer: currentOdometerValue > 0 ? currentOdometerValue : null,
        createdAt: new Date().toISOString()
      };

      if (activeTab === 'FUEL') {
        await addDoc(collection(db, "transactions"), {
          ...baseData,
          category: ExpenseCategory.FUEL,
          fuelType, // Salva se foi GNV, Gasolina, etc.
          liters: Number(liters),
          pricePerLiter: Number(pricePerLiter),
          fullTank,
          stationName: stationName || "Posto não informado"
        });
      } else {
        await addDoc(collection(db, "transactions"), { 
            ...baseData, 
            category, 
            isFixedCost: false 
        });
      }

      // ATUALIZAÇÃO DO VEÍCULO (Com integridade de data)
      const currentCar = vehicles.find(v => v.id === selectedVehicle);
      if (currentCar && currentOdometerValue > (currentCar.currentOdometer || 0)) {
        const updateData: any = { 
            currentOdometer: currentOdometerValue,
            updatedAt: new Date().toISOString()
        };
        // Se a data do lançamento for HOJE ou FUTURO, atualiza a data de referência do odômetro
        // Se for retroativo, NÃO atualiza a lastOdometerDate para não quebrar a lógica de "última leitura real"
        const launchDate = new Date(`${date}T00:00:00`);
        const today = new Date();
        today.setHours(0,0,0,0);

        if (launchDate >= today) {
            updateData.lastOdometerDate = new Date().toISOString();
        }

        await updateDoc(doc(db, "vehicles", selectedVehicle), updateData);
      }

      setSaving(false);
      setShowSuccess(true); 
      
      // Limpar campos
      setAmount("");
      setLiters("");
      setStationName("");
      setDescription("");

    } catch (error) {
      console.error(error);
      alert("Erro técnico ao salvar.");
      setSaving(false);
    }
  };

  const handleUpdateExpense = async (id: string, data: any) => {
     try {
       const ref = doc(db, "transactions", id);
       await updateDoc(ref, data);
     } catch (error) {
       throw error;
     }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteDoc(doc(db, "transactions", deleteId));
      setDeleteId(null);
    }
  };

  const formatMoney = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Registrar Despesas</h1>
      
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Salvo com Sucesso!" message="A despesa foi registrada e a quilometragem atualizada." />
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Excluir Despesa?" message="Essa ação não pode ser desfeita." />
      <ExpenseDetailsModal isOpen={!!selectedExpense} transaction={selectedExpense} onClose={() => setSelectedExpense(null)} onUpdate={handleUpdateExpense} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === ÁREA DE INPUT === */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900 rounded-xl border border-gray-800 sticky top-4 overflow-hidden shadow-xl">
            
            {/* ABAS */}
            <div className="flex border-b border-gray-800">
              <button onClick={() => setActiveTab('FUEL')} className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'FUEL' ? 'bg-gray-800 text-emerald-400 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                <Fuel size={18} /> Abastecimento
              </button>
              <button onClick={() => setActiveTab('GENERAL')} className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'GENERAL' ? 'bg-gray-800 text-emerald-400 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                <Wrench size={18} /> Manutenção
              </button>
            </div>

            <div className="p-6">
              {vehicles.length === 0 ? (
                <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg"><p className="text-sm text-red-400">Cadastre um veículo primeiro.</p></div>
              ) : (
                <form onSubmit={handleSave} className="space-y-4">
                  
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide font-bold">Veículo</label>
                    <select 
                      value={selectedVehicle} 
                      onChange={async (e) => {
                          const newId = e.target.value;
                          setSelectedVehicle(newId);
                          // Salva a preferência no Firestore
                          if (auth.currentUser) {
                              await setDoc(doc(db, "users", auth.currentUser.uid), { lastSelectedVehicleId: newId }, { merge: true });
                          }
                      }} 
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.name} - {v.currentOdometer}km</option>
                      ))}
                    </select>
                  </div>

                  {activeTab === 'FUEL' ? (
                    <>
                      {/* SELETOR DE COMBUSTÍVEL INTELIGENTE */}
                      <div className="mb-2">
                          <label className="block text-xs text-gray-500 mb-2 font-bold uppercase">Qual Combustível?</label>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                                const v = vehicles.find(veh => veh.id === selectedVehicle);
                                if (!v || !v.tanks) return <span className="text-gray-500 text-sm">Selecione um veículo</span>;
                                
                                const allFuels = Array.from(new Set(v.tanks.flatMap(t => t.fuelTypes)));

                                return allFuels.map(f => (
                                    <button
                                        key={f}
                                        type="button"
                                        onClick={() => setFuelType(f)}
                                        className={`flex-1 min-w-[80px] py-3 rounded-xl border font-bold text-sm transition-all relative overflow-hidden ${
                                            fuelType === f 
                                            ? (f === FuelType.ETHANOL ? 'bg-emerald-600 border-emerald-500 text-white' 
                                                : f === FuelType.GASOLINE ? 'bg-red-600 border-red-500 text-white'
                                                : f === FuelType.CNG ? 'bg-blue-600 border-blue-500 text-white'
                                                : 'bg-yellow-600 border-yellow-500 text-white')
                                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                                        }`}
                                    >
                                        {translateFuel(f)}
                                        {fuelType === f && <div className="absolute inset-0 bg-white/10 animate-pulse"></div>}
                                    </button>
                                ));
                            })()}
                          </div>
                      </div>

                      {/* INPUTS DE ABASTECIMENTO */}
                      <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 space-y-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><MapPin size={12} className="text-emerald-500"/> Posto / Estação</label>
                          <input value={stationName} onChange={e => setStationName(e.target.value)} placeholder="Ex: Posto Ipiranga" className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-white placeholder-gray-500 focus:border-emerald-500 outline-none transition-colors" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-emerald-400 mb-1 font-bold">Preço / {getUnit().replace('Litros', 'L')}</label>
                            <input type="number" step="0.001" required min="0" value={pricePerLiter} onChange={e => handlePriceChange(e.target.value)} onKeyDown={preventNegativeInput} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-white font-medium focus:border-emerald-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0.00" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Total (R$)</label>
                            <input type="number" step="0.01" min="0" value={amount} onChange={e => handleAmountChange(e.target.value)} onKeyDown={preventNegativeInput} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-white font-bold text-lg focus:border-emerald-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0.00" />
                          </div>
                        </div>
                        
                        <div className="relative">
                            <input type="number" step="0.001" required min="0" value={liters} onChange={e => handleLitersChange(e.target.value)} onKeyDown={preventNegativeInput} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-gray-300 font-mono text-sm pl-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            <span className="absolute left-3 top-2 text-xs text-gray-500 uppercase font-bold tracking-wider">{getUnit()}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Odômetro (KM Total)</label>
                        <input type="number" required min="0" value={odometer} onChange={e => setOdometer(e.target.value)} onKeyDown={preventNegativeInput} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white font-mono text-emerald-400 font-bold tracking-wider text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      </div>

                      <div className="flex items-center gap-3 py-2 bg-gray-800/30 p-2 rounded-lg cursor-pointer" onClick={() => setFullTank(!fullTank)}>
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${fullTank ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600'}`}>
                             {fullTank && <CheckCircle size={14} className="text-white" />}
                          </div>
                          <label className="text-sm text-gray-300 cursor-pointer select-none">
                              {fuelType === FuelType.ELECTRIC ? 'Carga Completa (100%)' : 'Tanque Cheio (Resetar média)'}
                          </label>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* === GERAIS === */}
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
                          <input type="number" step="0.01" required min="0" value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={preventNegativeInput} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white text-lg outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Odômetro (Opcional)</label>
                        <input type="number" min="0" value={odometer} onChange={e => setOdometer(e.target.value)} onKeyDown={preventNegativeInput} placeholder="KM no momento do serviço" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white font-mono placeholder-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      </div>
                    </>
                  )}

                  <div className="pt-2">
                    <label className="block text-xs text-gray-500 mb-1">Data</label>
                    <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white outline-none"/>
                  </div>

                  <button type="submit" disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all mt-2 transform active:scale-95">
                    {saving ? "Salvando..." : activeTab === 'FUEL' ? "Confirmar Abastecimento" : "Confirmar Despesa"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* === HISTÓRICO === */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <Droplets size={20} className="text-emerald-500" /> Histórico Recente
          </h2>

          <div className="space-y-3">
            {recentExpenses.map((exp) => (
              <div key={exp.id} onClick={() => setSelectedExpense(exp)} className="group bg-gray-900 border border-gray-800 p-4 rounded-xl flex justify-between items-center hover:border-emerald-500/30 transition-all hover:bg-gray-800/50 cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center border border-opacity-10 ${exp.category === 'FUEL' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500' : 'bg-blue-500/10 text-blue-500 border-blue-500'}`}>
                    {exp.category === 'FUEL' ? (
                        exp.fuelType === FuelType.CNG ? <Flame size={20}/> : 
                        exp.fuelType === FuelType.ELECTRIC ? <Zap size={20}/> : 
                        <Fuel size={20}/>
                    ) : <Wrench size={20}/>}
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg flex items-center gap-2">{formatMoney(exp.amount)}</p>
                    <p className="text-sm text-gray-400 capitalize flex items-center gap-2">
                      {exp.category === 'FUEL' ? (
                            <>
                                <span className="text-gray-300 font-bold bg-gray-800 px-1 rounded text-[10px] uppercase">{translateFuel(exp.fuelType)}</span>
                                <span className="text-gray-300">{exp.stationName || 'Posto'}</span>
                                <span className="text-gray-600">•</span>
                                <span>{Number(exp.liters).toFixed(1)}{exp.fuelType === FuelType.CNG ? 'm³' : 'L'}</span>
                            </>
                          ) : (exp.description || exp.category)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <span className="text-xs text-gray-500 flex items-center gap-1 justify-end"><Calendar size={12}/> {new Date(exp.date).toLocaleDateString('pt-BR')}</span>
                    {exp.odometer && <span className="text-xs text-emerald-500/70 block mt-1 font-mono">{exp.odometer} km</span>}
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