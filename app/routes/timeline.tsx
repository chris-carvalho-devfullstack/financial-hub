// app/routes/timeline.tsx

import { useEffect, useState, useMemo, useCallback } from "react";
import { 
  Calendar, Wrench, Fuel, TrendingUp, Filter, 
  Car, MapPin, ArrowDownCircle, Route, Flag, Layers,
  ChevronDown
} from "lucide-react";
import { supabase } from "~/lib/supabase.client";
import type { Vehicle, Transaction, ExpenseTransaction, FuelTransaction, IncomeTransaction } from "~/types/models";
import { ExpenseCategory, FuelType } from "~/types/enums";
import type { User } from "@supabase/supabase-js";

// === UTILITÁRIOS ===
const formatMoney = (val: number) => 
  (val / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const getMonthYear = (dateString: string) => {
  const date = new Date(dateString);
  // Primeira letra maiúscula
  const str = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// === COMPONENTE SKELETON ===
function TimelineSkeleton() {
  return (
    <div className="space-y-6 md:space-y-8 animate-pulse mt-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="relative flex gap-3 md:gap-4 md:pl-24">
           {/* Mobile Date Skeleton */}
           <div className="md:hidden flex flex-col items-center min-w-[3rem] gap-2 pt-1">
             <div className="h-5 w-8 bg-gray-800 rounded" />
             <div className="h-full w-0.5 bg-gray-800 rounded-full" />
           </div>
           {/* Desktop Dot Skeleton */}
           <div className="hidden md:block absolute left-9 top-0 w-10 h-10 -ml-3.5 rounded-full bg-gray-800 border-4 border-gray-900 z-10" />
           
           {/* Card Skeleton */}
           <div className="flex-1 p-5 rounded-xl border border-gray-800 bg-gray-900/40">
             <div className="flex justify-between mb-3">
               <div className="h-4 w-32 bg-gray-800 rounded" />
               <div className="h-4 w-16 bg-gray-800 rounded" />
             </div>
             <div className="h-3 w-48 bg-gray-800/50 rounded mb-2" />
             <div className="h-3 w-24 bg-gray-800/50 rounded" />
           </div>
        </div>
      ))}
    </div>
  );
}

// === COMPONENTE PRINCIPAL ===
export default function TimelinePage() {
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'FUEL' | 'MAINTENANCE'>('ALL');

  // === 0. AUTENTICAÇÃO ===
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // === 1. CARREGAR VEÍCULOS E PREFERÊNCIA ===
  const fetchVehiclesAndPref = useCallback(async () => {
    if (!user) return;
    
    // Busca veículos
    const { data: vData } = await supabase.from('vehicles').select('*').eq('user_id', user.id);
    if (vData) {
       // Mapeia snake_case -> camelCase
       const mappedVehicles = vData.map(v => ({
          ...v,
          userId: v.user_id,
          currentOdometer: v.current_odometer,
          fuelTypes: v.tanks ? v.tanks.flatMap((t: any) => t.fuelTypes) : []
       }));
       setVehicles(mappedVehicles as any);

       if (mappedVehicles.length > 0 && !selectedVehicleId) {
           // Tenta pegar preferência
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
        const channel = supabase.channel('realtime-vehicles-timeline')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => fetchVehiclesAndPref())
            .subscribe();
        return () => { supabase.removeChannel(channel); }
    }
  }, [user, fetchVehiclesAndPref]);

  // === 2. CARREGAR TRANSAÇÕES (REALTIME) ===
  const fetchTransactions = useCallback(async () => {
    if (!selectedVehicleId) return;
    setLoading(true);
    
    const { data, error } = await supabase
       .from('transactions')
       .select('*')
       .eq('vehicle_id', selectedVehicleId)
       .order('date', { ascending: false });

    if (!error && data) {
       // Mapeamento snake_case -> camelCase
       const mapped = data.map(t => ({
           ...t,
           userId: t.user_id,
           vehicleId: t.vehicle_id,
           fuelType: t.fuel_type,
           stationName: t.station_name,
           pricePerLiter: t.price_per_liter,
           fullTank: t.is_full_tank,
           distanceDriven: t.distance_driven,
           isFixedCost: t.is_fixed_cost
       }));
       setTransactions(mapped as any);
    }
    setLoading(false);
  }, [selectedVehicleId]);

  useEffect(() => {
    if (selectedVehicleId) {
        fetchTransactions();
        const channel = supabase.channel(`realtime-timeline-${selectedVehicleId}`)
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'transactions', filter: `vehicle_id=eq.${selectedVehicleId}` }, 
                () => fetchTransactions()
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); }
    }
  }, [selectedVehicleId, fetchTransactions]);

  // === 3. MEMO: AGRUPAMENTO E FILTRAGEM ===
  const groupedTransactions = useMemo(() => {
    const filtered = transactions.filter(t => {
      if (filterType === 'ALL') return true;
      if (filterType === 'INCOME') return t.type === 'INCOME';
      if (filterType === 'EXPENSE') return t.type === 'EXPENSE' && (t as ExpenseTransaction).category !== ExpenseCategory.FUEL;
      if (filterType === 'FUEL') return t.type === 'EXPENSE' && (t as ExpenseTransaction).category === ExpenseCategory.FUEL;
      if (filterType === 'MAINTENANCE') return t.type === 'EXPENSE' && (t as ExpenseTransaction).category === ExpenseCategory.MAINTENANCE;
      return true;
    });

    return filtered.reduce((groups, transaction) => {
      const key = getMonthYear(transaction.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(transaction);
      return groups;
    }, {} as Record<string, Transaction[]>);
  }, [transactions, filterType]);

  // === HELPERS DE ESTILO ===
  const getBubbleIcon = (t: Transaction) => {
    if (t.type === 'INCOME') return <TrendingUp size={16} className="text-white" />;
    const exp = t as ExpenseTransaction;
    if (exp.category === ExpenseCategory.FUEL) return <Fuel size={16} className="text-white" />;
    if (exp.category === ExpenseCategory.MAINTENANCE) return <Wrench size={16} className="text-white" />;
    return <ArrowDownCircle size={16} className="text-white" />;
  };

  const getBubbleColor = (t: Transaction) => {
    if (t.type === 'INCOME') return "bg-emerald-500 shadow-lg shadow-emerald-500/20";
    const exp = t as ExpenseTransaction;
    if (exp.category === ExpenseCategory.FUEL) return "bg-yellow-500 shadow-lg shadow-yellow-500/20";
    if (exp.category === ExpenseCategory.MAINTENANCE) return "bg-blue-500 shadow-lg shadow-blue-500/20";
    return "bg-red-500 shadow-lg shadow-red-500/20";
  };

  const getCardStyle = (t: Transaction) => {
    if (t.type === 'INCOME') return "border-emerald-500/30 bg-gradient-to-br from-emerald-900/10 to-gray-900";
    const exp = t as ExpenseTransaction;
    if (exp.category === ExpenseCategory.FUEL) return "border-yellow-500/30 bg-gradient-to-br from-yellow-900/10 to-gray-900";
    if (exp.category === ExpenseCategory.MAINTENANCE) return "border-blue-500/30 bg-gradient-to-br from-blue-900/10 to-gray-900";
    return "border-red-500/30 bg-gradient-to-br from-red-900/10 to-gray-900";
  };

  return (
    <div className="min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom))] bg-gray-950">
      
      {/* === HEADER STICKY (FILTROS) === */}
      <div className="bg-gray-900/90 backdrop-blur-xl border-b border-gray-800 sticky top-0 z-40 px-4 py-3 shadow-2xl transition-all duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 max-w-5xl mx-auto">
          
          <div className="flex items-center justify-between w-full md:w-auto">
             <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <div className="bg-emerald-500/20 p-2 rounded-lg">
                    <Route className="text-emerald-500" size={20} />
                </div>
                <span>Diário de Bordo</span>
             </h1>
             {/* Mobile: Contador de itens */}
             <span className="md:hidden text-xs font-mono text-gray-500 bg-gray-800 px-2 py-1 rounded-full">
                {transactions.length}
             </span>
          </div>

          <div className="grid grid-cols-2 w-full md:w-auto gap-3">
            {/* Seletor de Veículo */}
            <div className="relative">
              <Car className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              <select 
                value={selectedVehicleId}
                onChange={async (e) => {
                    const newId = e.target.value;
                    setSelectedVehicleId(newId);
                    if (user) {
                        await supabase.from('profiles').update({ last_selected_vehicle_id: newId }).eq('id', user.id);
                    }
                }}
                className="w-full pl-9 pr-8 bg-gray-800 border border-gray-700 text-white text-sm rounded-xl py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none font-medium truncate"
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
            </div>

            {/* Filtro de Tipo */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full pl-9 pr-8 bg-gray-800 border border-gray-700 text-white text-sm rounded-xl py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none font-medium"
              >
                <option value="ALL">Tudo</option>
                <option value="FUEL">Abastecimentos</option>
                <option value="MAINTENANCE">Manutenções</option>
                <option value="INCOME">Ganhos</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8">
        
        {loading ? (
          <TimelineSkeleton />
        ) : Object.keys(groupedTransactions).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 opacity-60 animate-in fade-in zoom-in duration-500">
              <div className="bg-gray-800/50 p-6 rounded-full mb-4 border border-gray-700 border-dashed">
                 <Route size={48} className="text-gray-500" />
              </div>
              <h3 className="text-gray-300 font-bold text-lg">Nenhum registro encontrado</h3>
              <p className="text-gray-500 text-sm mt-1 max-w-xs text-center">Tente alterar os filtros ou adicione uma nova despesa/ganho.</p>
          </div>
        ) : (
          <div className="relative space-y-10">
            
            {/* LINHA DE FUNDO (Mobile e Desktop) */}
            <div className="absolute left-4 md:left-9 top-0 bottom-0 w-[2px] bg-gradient-to-b from-emerald-500/20 via-gray-800 to-transparent md:hidden"></div>
            <div className="absolute left-9 top-0 bottom-0 w-1 bg-gray-800 hidden md:block rounded-full shadow-inner"></div>

            {Object.entries(groupedTransactions).map(([month, items]) => (
              <div key={month} className="relative animate-in slide-in-from-bottom-4 duration-500">
                
                {/* CABEÇALHO DO MÊS (Sticky) */}
                <div className="sticky top-[4.5rem] z-30 mb-6 flex items-center">
                    {/* Marcador Mobile */}
                    <div className="absolute left-[0.6rem] w-3 h-3 rounded-full bg-emerald-500 border-2 border-gray-950 md:hidden z-30 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    
                    {/* Badge */}
                    <div className="ml-8 md:ml-20 bg-gray-800/90 backdrop-blur border border-gray-700 text-emerald-400 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg uppercase tracking-wider flex items-center gap-2 select-none">
                       <Calendar size={12} /> {month}
                    </div>
                </div>

                <div className="space-y-6">
                  {items.map((t) => {
                    const isFuel = t.type === 'EXPENSE' && (t as ExpenseTransaction).category === ExpenseCategory.FUEL;
                    const fuelData = isFuel ? (t as FuelTransaction) : null;
                    const isIncome = t.type === 'INCOME';

                    return (
                      <div key={t.id} className="relative flex gap-3 md:gap-6 md:pl-24 group">
                        
                        {/* === INDICADOR LATERAL (Data) - Mobile === */}
                        <div className="md:hidden flex flex-col items-center min-w-[2.5rem] pt-1 z-10 bg-gray-950 pb-4">
                           <span className="text-lg font-bold text-gray-200 leading-none">{new Date(t.date).getDate()}</span>
                           <span className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter mt-0.5">{new Date(t.date).toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0,3)}</span>
                           {/* Ponto na linha */}
                           <div className={`w-2 h-2 rounded-full mt-2 border-2 border-gray-950 ${isIncome ? 'bg-emerald-500' : isFuel ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                        </div>

                        {/* === ÍCONE DA TIMELINE - Desktop === */}
                        <div className={`
                          hidden md:flex absolute left-9 top-0 w-10 h-10 -ml-3.5 rounded-full border-4 border-gray-950 z-10 
                          items-center justify-center transition-transform duration-300 group-hover:scale-110
                          ${getBubbleColor(t)}
                        `}>
                            {getBubbleIcon(t)}
                        </div>

                        {/* === CARD PRINCIPAL === */}
                        <div className="flex-1 min-w-0"> {/* min-w-0 evita overflow de texto */}
                           <div className={`
                             relative p-4 md:p-5 rounded-2xl border transition-all duration-200 
                             active:scale-[0.99] hover:shadow-xl hover:border-opacity-50
                             ${getCardStyle(t)} backdrop-blur-md
                           `}>
                             
                             <div className="flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                   <div className="flex items-center gap-2 mb-1">
                                      {/* Badge Mobile Inline */}
                                      <div className={`md:hidden p-1 rounded ${getBubbleColor(t)} bg-opacity-20`}>
                                         {getBubbleIcon(t)}
                                      </div>
                                      
                                      <h3 className="font-bold text-gray-100 text-base md:text-lg leading-tight truncate">
                                        {isFuel ? 'Abastecimento' : isIncome ? 'Receita' : (t.description || 'Despesa')}
                                      </h3>
                                   </div>

                                   {/* Detalhes (Subtítulo) */}
                                   <div className="text-xs text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                                      {/* Data no Desktop */}
                                      <span className="hidden md:inline bg-gray-950/30 px-1.5 py-0.5 rounded font-mono">
                                        {formatDate(t.date)}
                                      </span>

                                      {isFuel && fuelData?.stationName && (
                                        <span className="flex items-center gap-1 text-yellow-500/90 truncate max-w-[120px]">
                                            <MapPin size={10}/> {fuelData.stationName}
                                        </span>
                                      )}

                                      {!isFuel && !isIncome && (
                                          <span className="bg-gray-950/30 px-1.5 py-0.5 rounded text-gray-300">
                                              {(t as ExpenseTransaction).category}
                                          </span>
                                      )}
                                      
                                      {/* Se for Múltiplo App (Ganho) */}
                                      {isIncome && t.platform === 'MULTIPLE' && (
                                          <span className="flex items-center gap-1 text-indigo-400">
                                              <Layers size={10} /> Múltiplos
                                          </span>
                                      )}
                                   </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className={`text-base md:text-xl font-bold whitespace-nowrap ${isIncome ? 'text-emerald-400' : 'text-white'}`}>
                                    {isIncome ? '+' : '-'}{formatMoney(t.amount)}
                                  </span>
                                </div>
                             </div>

                             {/* RODAPÉ DO CARD (ODÔMETRO E EXTRAS) */}
                             <div className="mt-3 pt-3 border-t border-gray-700/20 flex flex-wrap gap-2 text-xs items-center">
                                   
                                   {/* Badge de Odômetro */}
                                   {t.odometer && t.odometer > 0 && (
                                     <div className="flex items-center gap-1 bg-black/30 border border-gray-700/30 px-2 py-1 rounded-md">
                                        <span className="text-gray-500 font-bold tracking-wider text-[10px]">KM</span>
                                        <span className="font-mono text-gray-200 font-bold">
                                           {t.odometer.toLocaleString('pt-BR')}
                                        </span>
                                     </div>
                                   )}

                                   {/* Badge de Combustível */}
                                   {isFuel && fuelData && (
                                     <>
                                       <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 px-2 py-1 rounded-md">
                                         <Fuel size={10} />
                                         <span className="font-bold">{fuelData.liters}L</span>
                                       </div>
                                       {fuelData.fullTank && (
                                         <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Cheio</span>
                                       )}
                                     </>
                                   )}

                                   {/* Badge de Corrida (Ganhos) */}
                                   {isIncome && (t as IncomeTransaction).distanceDriven > 0 && (
                                      <div className="flex items-center gap-2">
                                         <div className="flex items-center gap-1 text-blue-300 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                                            <Car size={10} /> 
                                            <span>{(t as IncomeTransaction).distanceDriven}km</span>
                                         </div>
                                         <span className="text-emerald-500 font-mono font-bold">
                                             R$ {((t.amount / 100) / (t as IncomeTransaction).distanceDriven).toFixed(2)}/km
                                         </span>
                                      </div>
                                   )}
                             </div>

                           </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* FIM DA LINHA */}
            <div className="relative flex gap-3 md:gap-6 md:pl-24 pb-8">
               <div className="md:hidden flex flex-col items-center min-w-[2.5rem]">
                   <div className="w-2 h-2 rounded-full bg-gray-700 mt-2"></div>
               </div>
               <div className="hidden md:flex absolute left-9 top-0 w-10 h-10 -ml-3.5 rounded-full bg-gray-800 border-4 border-gray-900 items-center justify-center text-emerald-500">
                   <Flag size={18} />
               </div>
               
               <div className="flex-1 p-5 rounded-xl border border-dashed border-gray-800 bg-gray-900/20 text-center">
                   <p className="text-gray-500 text-sm">Fim do histórico carregado.</p>
                   <p className="text-xs text-gray-600 mt-1">Continue dirigindo para adicionar mais registros.</p>
               </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}