import { useEffect, useState } from "react";
import { collection, addDoc, query, where, orderBy, limit, onSnapshot, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { Fuel, Wrench, Droplets, Calendar, Trash2, MapPin, X, CheckCircle, AlertTriangle } from "lucide-react";
import { db, auth } from "~/lib/firebase.client";
import { ExpenseCategory, FuelType } from "~/types/enums";
import type { Vehicle } from "~/types/models";

// === COMPONENTES DE MODAL (Internos) ===

function SuccessModal({ isOpen, onClose, title, message }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-emerald-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl transform transition-all scale-100">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-400 mb-6">{message}</p>
          <button 
            onClick={onClose}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors"
          >
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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

// === PÁGINA PRINCIPAL ===

export default function DespesasPage() {
  const [activeTab, setActiveTab] = useState<'FUEL' | 'GENERAL'>('FUEL');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados de Modal
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null); // Se tiver ID, mostra modal de deletar

  // Estados Comuns
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [amount, setAmount] = useState(""); 
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState("");

  // Estados Específicos de Combustível
  const [fuelType, setFuelType] = useState<FuelType>(FuelType.GASOLINE);
  const [liters, setLiters] = useState("");
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [odometer, setOdometer] = useState("");
  const [fullTank, setFullTank] = useState(true);
  const [stationName, setStationName] = useState(""); // Novo campo: Posto

  // Estados Específicos Gerais
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.MAINTENANCE);

  // Carregar Dados
  useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;

    const qVehicles = query(collection(db, "vehicles"), where("userId", "==", userId));
    const unsubVehicles = onSnapshot(qVehicles, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Vehicle[];
      setVehicles(data);
      if (data.length > 0 && !selectedVehicle) {
        setSelectedVehicle(data[0].id);
        setOdometer(String(data[0].currentOdometer)); 
      }
    });

    const qExpenses = query(
      collection(db, "transactions"), 
      where("userId", "==", userId),
      where("type", "==", "EXPENSE"),
      orderBy("date", "desc"),
      limit(5)
    );

    const unsubExpenses = onSnapshot(qExpenses, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRecentExpenses(data);
      setLoading(false);
    }, (err) => console.error(err));

    return () => { unsubVehicles(); unsubExpenses(); };
  }, []);

  // Atualizar odômetro ao trocar de carro
  useEffect(() => {
    const vehicle = vehicles.find(v => v.id === selectedVehicle);
    if (vehicle) setOdometer(String(vehicle.currentOdometer));
  }, [selectedVehicle, vehicles]);

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
      
      const baseData = {
        userId: auth.currentUser.uid,
        vehicleId: selectedVehicle,
        type: 'EXPENSE',
        amount: amountInCents,
        date: new Date(date).toISOString(),
        description: activeTab === 'FUEL' ? 'Abastecimento' : description,
        createdAt: new Date().toISOString()
      };

      if (activeTab === 'FUEL') {
        await addDoc(collection(db, "transactions"), {
          ...baseData,
          category: ExpenseCategory.FUEL,
          fuelType,
          liters: Number(liters),
          pricePerLiter: Number(pricePerLiter),
          odometer: Number(odometer),
          fullTank,
          stationName: stationName || "Posto não informado" // Salva o posto
        });

        // Atualizar KM do carro
        const currentCar = vehicles.find(v => v.id === selectedVehicle);
        if (currentCar && Number(odometer) > currentCar.currentOdometer) {
          await updateDoc(doc(db, "vehicles", selectedVehicle), { currentOdometer: Number(odometer) });
        }
      } else {
        await addDoc(collection(db, "transactions"), { ...baseData, category, isFixedCost: false });
      }

      setSaving(false);
      setShowSuccess(true); // Exibir Modal de Sucesso
      
      // Limpar campos
      setAmount("");
      setLiters("");
      setStationName("");
      setDescription("");

    } catch (error) {
      console.error(error);
      alert("Erro técnico ao salvar."); // Fallback simples para erro de sistema
      setSaving(false);
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
      
      {/* MODAIS */}
      <SuccessModal 
        isOpen={showSuccess} 
        onClose={() => setShowSuccess(false)} 
        title="Salvo com Sucesso!" 
        message="A despesa foi registrada e seu histórico atualizado."
      />
      
      <ConfirmModal 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Despesa?"
        message="Essa ação não pode ser desfeita e removerá o registro do cálculo financeiro."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === ÁREA DE INPUT === */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900 rounded-xl border border-gray-800 sticky top-4 overflow-hidden shadow-xl">
            
            {/* ABAS */}
            <div className="flex border-b border-gray-800">
              <button 
                onClick={() => setActiveTab('FUEL')}
                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  activeTab === 'FUEL' ? 'bg-gray-800 text-emerald-400 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Fuel size={18} /> Abastecimento
              </button>
              <button 
                onClick={() => setActiveTab('GENERAL')}
                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  activeTab === 'GENERAL' ? 'bg-gray-800 text-emerald-400 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Wrench size={18} /> Manutenção
              </button>
            </div>

            <div className="p-6">
              {vehicles.length === 0 ? (
                <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">Cadastre um veículo primeiro.</p>
                </div>
              ) : (
                <form onSubmit={handleSave} className="space-y-4">
                  
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide font-bold">Veículo</label>
                    <select 
                      value={selectedVehicle}
                      onChange={e => setSelectedVehicle(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.name} - {v.currentOdometer}km</option>
                      ))}
                    </select>
                  </div>

                  {activeTab === 'FUEL' ? (
                    <>
                      {/* === ABASTECIMENTO === */}
                      <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 space-y-4">
                        
                        {/* NOVO CAMPO: POSTO */}
                        <div>
                          <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
                            <MapPin size={12} className="text-emerald-500"/> Posto de Combustível
                          </label>
                          <input 
                            value={stationName}
                            onChange={e => setStationName(e.target.value)}
                            placeholder="Ex: Posto Ipiranga Centro"
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-white placeholder-gray-500 focus:border-emerald-500 outline-none transition-colors"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-emerald-400 mb-1 font-bold">Preço/Litro</label>
                            <input 
                              type="number" step="0.01" required 
                              value={pricePerLiter} 
                              onChange={e => handlePriceChange(e.target.value)} 
                              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-white font-medium focus:border-emerald-500 outline-none"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Total (R$)</label>
                            <input 
                              type="number" step="0.01" 
                              value={amount} 
                              onChange={e => handleAmountChange(e.target.value)} 
                              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-white font-bold text-lg focus:border-emerald-500 outline-none"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        
                        <div className="relative">
                           <input 
                              type="number" step="0.001" required 
                              value={liters} 
                              onChange={e => handleLitersChange(e.target.value)} 
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-gray-300 font-mono text-sm pl-16"
                            />
                            <span className="absolute left-3 top-2 text-xs text-gray-500 uppercase font-bold tracking-wider">Litros</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Odômetro (KM Total)</label>
                        <input type="number" required value={odometer} onChange={e => setOdometer(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white font-mono text-emerald-400 font-bold tracking-wider text-lg"/>
                      </div>

                      <div className="flex items-center gap-3 py-2 bg-gray-800/30 p-2 rounded-lg cursor-pointer" onClick={() => setFullTank(!fullTank)}>
                         <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${fullTank ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600'}`}>
                            {fullTank && <CheckCircle size={14} className="text-white" />}
                         </div>
                         <label className="text-sm text-gray-300 cursor-pointer select-none">Encheu o tanque? (Resetar média)</label>
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
                         <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white text-lg outline-none"/>
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
              <div key={exp.id} className="group bg-gray-900 border border-gray-800 p-4 rounded-xl flex justify-between items-center hover:border-emerald-500/30 transition-all hover:bg-gray-800/50">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center border border-opacity-10 ${exp.category === 'FUEL' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500' : 'bg-blue-500/10 text-blue-500 border-blue-500'}`}>
                    {exp.category === 'FUEL' ? <Fuel size={20}/> : <Wrench size={20}/>}
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg">{formatMoney(exp.amount)}</p>
                    <p className="text-sm text-gray-400 capitalize flex items-center gap-2">
                      {exp.category === 'FUEL' 
                        ? (
                            <>
                                <span className="text-gray-300">{exp.stationName || 'Posto'}</span>
                                <span className="text-gray-600">•</span>
                                <span>{Number(exp.liters).toFixed(1)}L</span>
                            </>
                          ) 
                        : (exp.description || exp.category)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <span className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                      <Calendar size={12}/> {new Date(exp.date).toLocaleDateString('pt-BR')}
                    </span>
                    {exp.category === 'FUEL' && (
                        <span className="text-xs text-emerald-500/70 block mt-1 font-mono">
                            {exp.odometer} km
                        </span>
                    )}
                  </div>
                  
                  {/* BOTÃO DE DELETAR */}
                  <button 
                    onClick={() => setDeleteId(exp.id)}
                    className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100"
                    title="Excluir registro"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
             {recentExpenses.length === 0 && !loading && (
                <div className="p-8 border border-dashed border-gray-800 rounded-xl text-center">
                    <p className="text-gray-500">Nenhuma despesa registrada.</p>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}