import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { 
  Calendar, Wrench, Fuel, TrendingUp, Filter, 
  Car, MapPin, ArrowDownCircle, Route, Flag 
} from "lucide-react"; // DollarSign removido dos imports não utilizados no JSX (mas usado no cálculo se precisar, removi do visual)
import { db, auth } from "~/lib/firebase.client";
import type { Vehicle, Transaction, ExpenseTransaction, FuelTransaction, IncomeTransaction } from "~/types/models";
import { ExpenseCategory } from "~/types/enums";

// === UTILITÁRIOS ===
const formatMoney = (val: number) => 
  (val / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const getMonthYear = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

// === COMPONENTE PRINCIPAL ===
export default function TimelinePage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'FUEL' | 'MAINTENANCE'>('ALL');

  // 1. Carregar Veículos
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (!user) return;
      const q = query(collection(db, "vehicles"), where("userId", "==", user.uid));
      onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Vehicle[];
        setVehicles(data);
        if (data.length > 0 && !selectedVehicleId) {
          setSelectedVehicleId(data[0].id);
        }
      });
    });
    return () => unsub && unsub();
  }, []);

  // 2. Carregar Transações
  useEffect(() => {
    if (!selectedVehicleId) return;
    setLoading(true);
    
    const q = query(
      collection(db, "transactions"),
      where("vehicleId", "==", selectedVehicleId),
      orderBy("date", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[];
      setTransactions(data);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedVehicleId]);

  // 3. Filtragem
  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'ALL') return true;
    if (filterType === 'INCOME') return t.type === 'INCOME';
    if (filterType === 'EXPENSE') return t.type === 'EXPENSE' && (t as ExpenseTransaction).category !== ExpenseCategory.FUEL;
    if (filterType === 'FUEL') return t.type === 'EXPENSE' && (t as ExpenseTransaction).category === ExpenseCategory.FUEL;
    if (filterType === 'MAINTENANCE') return t.type === 'EXPENSE' && (t as ExpenseTransaction).category === ExpenseCategory.MAINTENANCE;
    return true;
  });

  const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
    const key = getMonthYear(transaction.date);
    if (!groups[key]) groups[key] = [];
    groups[key].push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>);

  // === ESTILOS VISUAIS ===
  
  const getBubbleIcon = (t: Transaction) => {
    if (t.type === 'INCOME') return <TrendingUp size={18} className="text-white" />;
    const exp = t as ExpenseTransaction;
    if (exp.category === ExpenseCategory.FUEL) return <Fuel size={18} className="text-white" />;
    if (exp.category === ExpenseCategory.MAINTENANCE) return <Wrench size={18} className="text-white" />;
    return <ArrowDownCircle size={18} className="text-white" />;
  };

  const getBubbleColor = (t: Transaction) => {
    if (t.type === 'INCOME') return "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]";
    const exp = t as ExpenseTransaction;
    if (exp.category === ExpenseCategory.FUEL) return "bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]";
    if (exp.category === ExpenseCategory.MAINTENANCE) return "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]";
    return "bg-red-500";
  };

  const getCardStyle = (t: Transaction) => {
    if (t.type === 'INCOME') return "border-emerald-500/30 bg-emerald-900/20 hover:bg-emerald-900/30";
    const exp = t as ExpenseTransaction;
    if (exp.category === ExpenseCategory.FUEL) return "border-yellow-500/30 bg-yellow-900/20 hover:bg-yellow-900/30";
    if (exp.category === ExpenseCategory.MAINTENANCE) return "border-blue-500/30 bg-blue-900/20 hover:bg-blue-900/30";
    return "border-red-500/30 bg-red-900/20 hover:bg-red-900/30";
  };

  const getArrowColor = (t: Transaction) => {
    if (t.type === 'INCOME') return "bg-emerald-900/20 border-emerald-500/30";
    const exp = t as ExpenseTransaction;
    if (exp.category === ExpenseCategory.FUEL) return "bg-yellow-900/20 border-yellow-500/30";
    if (exp.category === ExpenseCategory.MAINTENANCE) return "bg-blue-900/20 border-blue-500/30";
    return "bg-red-900/20 border-red-500/30";
  };

  return (
    <div className="min-h-screen pb-20 bg-gray-950">
      {/* HEADER FIXO */}
      <div className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-30 p-4 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Route className="text-emerald-500" /> Diário de Bordo
          </h1>

          <div className="flex w-full md:w-auto gap-3">
            <div className="relative flex-1 md:w-64">
              <Car className="absolute left-3 top-3 text-gray-500" size={16} />
              <select 
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full pl-10 bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 md:w-48">
              <Filter className="absolute left-3 top-3 text-gray-500" size={16} />
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full pl-10 bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
              >
                <option value="ALL">Tudo</option>
                <option value="FUEL">Abastecimentos</option>
                <option value="MAINTENANCE">Manutenções</option>
                <option value="INCOME">Ganhos</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8">
        
        {loading ? (
          <p className="text-center text-gray-500 animate-pulse mt-10">Carregando mapa...</p>
        ) : Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-20 opacity-50">
             <div className="inline-block p-4 rounded-full bg-gray-800 mb-4">
                <Route size={40} className="text-gray-500" />
             </div>
             <p className="text-gray-400 text-lg">Nenhum registro encontrado nesta rota.</p>
          </div>
        ) : (
          <div className="relative space-y-12">
            
            {/* === RODOVIA (LINHA DE FUNDO) === */}
            {/* Ajuste: Top-5 (centro do primeiro ícone) e Bottom-0 (vai até o fim) */}
            <div className="absolute left-8 md:left-9 top-5 bottom-0 w-3 bg-gray-800 rounded-full hidden md:block shadow-inner border border-gray-700/50">
                <div className="w-full h-full border-l border-dashed border-gray-600/30 mx-auto w-0"></div>
            </div>

            {Object.entries(groupedTransactions).map(([month, items]) => (
              <div key={month} className="relative">
                
                {/* PLACA DE SINALIZAÇÃO (MÊS) */}
                <div className="sticky top-24 z-20 mb-8 flex justify-center md:justify-start md:pl-20">
                   <div className="bg-gray-800 border border-gray-600 text-emerald-400 px-6 py-1.5 rounded-lg text-sm font-bold shadow-lg uppercase tracking-wider flex items-center gap-2 hover:bg-gray-700 transition-colors">
                      <Calendar size={14} /> {month}
                   </div>
                </div>

                <div className="space-y-8">
                  {items.map((t, index) => {
                    const isFuel = t.type === 'EXPENSE' && (t as ExpenseTransaction).category === ExpenseCategory.FUEL;
                    const fuelData = isFuel ? (t as FuelTransaction) : null;
                    const isIncome = t.type === 'INCOME';

                    return (
                      <div key={t.id} className="relative md:pl-24 flex gap-4 group">
                        
                        {/* === MARCO NA ESTRADA (ÍCONE) === */}
                        <div className={`
                          hidden md:flex absolute left-9 top-0 w-10 h-10 -ml-3.5 rounded-full border-4 border-gray-900 z-10 
                          items-center justify-center transition-transform duration-300 group-hover:scale-110
                          ${getBubbleColor(t)}
                        `}>
                            {getBubbleIcon(t)}
                        </div>

                        {/* Mobile: Data lateral */}
                        <div className="md:hidden flex flex-col items-center min-w-[3.5rem] pt-1">
                           <span className="text-lg font-bold text-gray-300">{new Date(t.date).getDate()}</span>
                           <span className="text-xs text-gray-500 uppercase">{new Date(t.date).toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0,3)}</span>
                           <div className="h-full w-0.5 bg-gray-800 mt-2 rounded-full"></div>
                        </div>

                        {/* === CARD DO CONTEÚDO === */}
                        <div className="flex-1">
                           <div className={`
                             relative p-5 rounded-xl border transition-all duration-300 hover:shadow-2xl hover:translate-x-1
                             ${getCardStyle(t)} backdrop-blur-sm
                           `}>
                              
                              <div className={`
                                hidden md:block absolute top-4 -left-2 w-4 h-4 transform rotate-45 border-l border-b 
                                ${getArrowColor(t)}
                              `}></div>

                              <div className="flex justify-between items-start mb-2 relative z-10">
                                <div className="flex items-center gap-3">
                                  <div className={`md:hidden p-2 rounded-lg ${getBubbleColor(t)} bg-opacity-20`}>
                                     {getBubbleIcon(t)}
                                  </div>
                                  
                                  <div>
                                    <h3 className="font-bold text-gray-100 text-lg leading-tight">
                                      {isFuel ? 'Abastecimento' : isIncome ? 'Receita da Corrida' : (t.description || 'Despesa')}
                                    </h3>
                                    <p className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                                      <span className="bg-gray-900/50 px-2 py-0.5 rounded text-gray-500 font-mono">
                                        {formatDate(t.date)}
                                      </span>
                                      {isFuel && fuelData?.stationName && (
                                        <span className="flex items-center gap-1 text-yellow-500/80"><MapPin size={12}/> {fuelData.stationName}</span>
                                      )}
                                      {!isFuel && !isIncome && (t as ExpenseTransaction).category}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`text-xl font-bold ${isIncome ? 'text-emerald-400' : 'text-white'}`}>
                                    {isIncome ? '+' : '-'}{formatMoney(t.amount)}
                                  </span>
                                  {isFuel && fuelData?.odometer && (
                                     <div className="text-xs text-gray-500 font-mono mt-1 bg-black/30 px-2 py-0.5 rounded inline-block">
                                        KM {fuelData.odometer}
                                     </div>
                                  )}
                                </div>
                              </div>

                              {(isFuel || isIncome) && (
                                <div className="mt-4 pt-3 border-t border-gray-700/30 flex flex-wrap gap-3 text-sm text-gray-300">
                                   {isFuel && fuelData && (
                                     <>
                                       <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded">
                                         <Fuel size={14} className="text-yellow-500"/>
                                         <span className="font-bold">{fuelData.liters}L</span>
                                         <span className="text-gray-500 text-xs ml-1">({formatMoney(fuelData.pricePerLiter * 100)}/L)</span>
                                       </div>
                                       {fuelData.fullTank && (
                                         <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded border border-emerald-500/20">Tanque Cheio</span>
                                       )}
                                     </>
                                   )}
                                   {isIncome && (t as IncomeTransaction).distanceDriven > 0 && (
                                     <div className="flex items-center gap-2">
                                       <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded">
                                          <Car size={14} className="text-blue-400" /> 
                                          <span>{(t as IncomeTransaction).distanceDriven} km</span>
                                       </div>
                                       <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded">
                                          {/* Ajuste: Ícone de cifrão removido daqui, mantendo apenas texto R$ */}
                                          <span className="text-emerald-400 font-bold">R$ {((t.amount / 100) / (t as IncomeTransaction).distanceDriven).toFixed(2)}/km</span>
                                       </div>
                                     </div>
                                   )}
                                </div>
                              )}
                           </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* === EVENTO INICIAL (PADRONIZADO) === */}
            <div className="relative md:pl-24 flex gap-4 group">
              
              {/* MÁSCARA DA ESTRADA: Esconde a linha da metade do ícone para baixo */}
              <div className="absolute left-8 md:left-9 top-5 bottom-0 w-3 bg-gray-950 z-0 hidden md:block"></div>

              {/* Ícone de Início */}
              <div className="hidden md:flex absolute left-9 top-0 w-10 h-10 -ml-3.5 rounded-full border-4 border-gray-900 z-10 items-center justify-center bg-gray-800 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                  <Flag size={18} className="text-emerald-400" />
              </div>

              {/* Mobile Marker */}
              <div className="md:hidden flex flex-col items-center min-w-[3.5rem] pt-1">
                 <Flag size={18} className="text-emerald-500" />
              </div>

              {/* Card Padronizado */}
              <div className="flex-1 relative z-10">
                 <div className="relative p-5 rounded-xl border border-gray-700/50 bg-gray-900/40 backdrop-blur-sm hover:bg-gray-800/50 transition-colors">
                    
                    <div className="hidden md:block absolute top-4 -left-2 w-4 h-4 transform rotate-45 border-l border-b border-gray-700/50 bg-gray-900/40"></div>

                    <div className="flex justify-between items-start mb-2 relative z-10">
                      <div>
                        <h3 className="font-bold text-emerald-400 text-lg leading-tight">
                          Bem-Vindo à Financial Drive Hub!
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                           Sua jornada começa aqui.
                        </p>
                      </div>
                      <div className="text-right">
                         <span className="text-lg font-bold text-gray-500">---</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-700/30 text-sm text-gray-400 italic">
                      "Não é apenas sobre chegar ao destino, é sobre o quanto você lucra no caminho. Mantenha o controle e acelere seus resultados."
                    </div>
                 </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}