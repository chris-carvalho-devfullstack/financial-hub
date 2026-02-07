// app/routes/dashboard.tsx

import { useEffect, useState, useRef } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { 
  TrendingUp, TrendingDown, Wallet, MapPin, AlertCircle, ChevronLeft, ChevronRight, 
  Calendar, Clock, Zap, Gauge, Fuel, Trophy, Target, Wrench, Hash, DollarSign,
  ChevronDown 
} from "lucide-react";
import { supabase } from "~/lib/supabase.client";
import type { Vehicle, Transaction, IncomeTransaction, FuelTransaction } from "~/types/models";
import { ExpenseCategory, Platform } from "~/types/enums";
import { OdometerChart } from "~/components/OdometerChart"; 

// Tipos
type TimeFilter = 'DAY' | 'WEEK' | 'MONTH';

// === HELPER: LOGO DO VEÍCULO ===
const getBrandLogo = (brand: string) => {
  if (!brand) return "/logos/brands/generic.png";
  const safeBrand = brand.toLowerCase().trim().replace(/\s+/g, '-');
  return `/logos/brands/${safeBrand}.png`;
};

// === HELPER: SAUDAÇÃO DINÂMICA ===
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
};

// === HELPER: DATA (Filtros Temporais) ===
const getStartEndDates = (date: Date, filter: TimeFilter) => {
  const start = new Date(date);
  const end = new Date(date);

  if (filter === 'DAY') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (filter === 'WEEK') {
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Ajuste para segunda-feira
    start.setDate(diff);
    start.setHours(0,0,0,0);
    end.setDate(start.getDate() + 6);
    end.setHours(23,59,59,999);
  } else {
    start.setDate(1);
    start.setHours(0,0,0,0);
    end.setMonth(start.getMonth() + 1);
    end.setDate(0);
    end.setHours(23,59,59,999);
  }
  return { start, end };
};

// === LÓGICA DE MÉDIA REAL (TANQUE A TANQUE) ===
const calculateTankToTankEfficiency = (transactions: any[]) => {
  const fuels = transactions
    .filter(t => Number(t.liters) > 0) 
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (fuels.length < 2) return 0;

  let totalDist = 0;
  let totalLiters = 0;
  
  const fullTankIndices = fuels
    .map((t, index) => (t.is_full_tank || t.fullTank || t.isFullTank) ? index : -1)
    .filter(index => index !== -1);

  if (fullTankIndices.length < 2) return 0;

  for (let i = 0; i < fullTankIndices.length - 1; i++) {
    const startIdx = fullTankIndices[i];
    const endIdx = fullTankIndices[i+1];
    
    const startTx = fuels[startIdx];
    const endTx = fuels[endIdx];

    const startOdo = Number(startTx.odometer);
    const endOdo = Number(endTx.odometer);

    if (startOdo > 0 && endOdo > startOdo) {
      const dist = endOdo - startOdo;
      let litersInCycle = 0;
      for (let j = startIdx + 1; j <= endIdx; j++) {
         litersInCycle += Number(fuels[j].liters);
      }

      if (dist > 0 && litersInCycle > 0) {
        totalDist += dist;
        totalLiters += litersInCycle;
      }
    }
  }

  return totalLiters > 0 ? (totalDist / totalLiters) : 0;
};

// === COMPONENTE: TOOLTIP DO GRÁFICO ===
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-gray-700 p-4 rounded-lg shadow-xl ring-1 ring-black/50 z-50">
        <p className="text-gray-300 font-medium mb-2 border-b border-gray-800 pb-1">Dia {label}</p>
        <div className="flex items-center gap-2 text-sm mb-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-gray-400">Entradas:</span>
          <span className="text-emerald-400 font-bold ml-auto">
            {payload[0].value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
        {payload[1] && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-gray-400">Saídas:</span>
            <span className="text-red-400 font-bold ml-auto">
              {payload[1].value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// === COMPONENTE: SMART CARD ===
function SmartCard({ title, value, subtitle, icon: Icon, color, highlight = false, alert = false }: any) {
  const colors: any = {
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    red: "text-red-500 bg-red-500/10 border-red-500/20",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    indigo: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    violet: "text-violet-500 bg-violet-500/10 border-violet-500/20",
    pink: "text-pink-500 bg-pink-500/10 border-pink-500/20",
    cyan: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
    lime: "text-lime-500 bg-lime-500/10 border-lime-500/20",
    orange: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    teal: "text-teal-500 bg-teal-500/10 border-teal-500/20",
    gray: "text-gray-400 bg-gray-500/10 border-gray-500/20"
  };

  const styleClass = colors[color] || colors.gray;

  return (
    <div className={`
      relative p-5 rounded-2xl border shadow-lg overflow-hidden group hover:border-gray-600 transition-all
      ${highlight ? 'bg-gray-800/80 border-gray-600' : 'bg-gray-900 border-gray-800'}
      ${alert ? 'border-amber-500/50' : ''}
    `}>
      <div className="flex justify-between items-start mb-3">
         <div className={`p-2.5 rounded-xl ${styleClass}`}>
            <Icon size={22} />
         </div>
      </div>
      <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{title}</p>
      <h3 className="text-xl md:text-2xl font-bold text-white mt-0.5 mb-0.5 truncate">{value}</h3>
      <p className={`text-[10px] truncate ${alert ? 'text-amber-500 font-bold' : 'text-gray-500'}`}>{subtitle}</p>
    </div>
  );
}

export default function Dashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [isVehicleMenuOpen, setIsVehicleMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string>("Motorista");
  
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastFuelPrice, setLastFuelPrice] = useState<number>(0); 
  const [vehicleRealAvg, setVehicleRealAvg] = useState<number>(0);

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('MONTH');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Ref para o input de data (usado para abrir o calendário nativo)
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [metrics, setMetrics] = useState({
    income: 0, expense: 0, profit: 0,
    km: 0, hours: 0,
    trips: 0, 
    avgTicket: 0, tripsPerHour: 0,
    profitPerHour: 0, profitPerKm: 0, 
    fuelCostPerKmPanel: 0, fuelCostPerKmPump: 0, maintenanceCostPerKm: 0,
    grossPerHour: 0, grossPerKm: 0, avgDailyIncome: 0,
    clusterAvg: 0, 
    realAvg: 0,
    isRealAvgReliable: false, 
    bestApp: { name: '-', amount: 0 }
  });

  const [chartData, setChartData] = useState<any[]>([]);

  // === 1. NAVEGAÇÃO DE DATA ===
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    const method = direction === 'next' ? 1 : -1;
    if (timeFilter === 'DAY') newDate.setDate(newDate.getDate() + method);
    if (timeFilter === 'WEEK') newDate.setDate(newDate.getDate() + (method * 7));
    if (timeFilter === 'MONTH') newDate.setMonth(newDate.getMonth() + method);
    setCurrentDate(newDate);
  };

  // === 2. CARREGAR DADOS (VEÍCULOS E NOME DO USUÁRIO) ===
  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return; 

      // Pega o nome para a saudação
      const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || "Motorista";
      setUserName(fullName.split(' ')[0]); // Pega apenas o primeiro nome

      const { data: vehiclesData } = await supabase.from('vehicles').select('*').eq('user_id', session.user.id);

      const mappedVehicles: Vehicle[] = (vehiclesData || []).map((v: any) => ({
        id: v.id,
        userId: v.user_id,
        name: v.name,
        brand: v.brand,
        model: v.model,
        type: v.type,
        year: v.year,
        tanks: v.tanks,
        currentOdometer: v.current_odometer,
        isDefault: v.is_default,
        createdAt: v.created_at
      }));

      setVehicles(mappedVehicles);

      const { data: profileData } = await supabase.from('profiles').select('last_selected_vehicle_id').eq('id', session.user.id).single();

      if (profileData?.last_selected_vehicle_id && mappedVehicles.find(v => v.id === profileData.last_selected_vehicle_id)) {
        setSelectedVehicleId(profileData.last_selected_vehicle_id);
      } else if (mappedVehicles.length > 0) {
        setSelectedVehicleId(mappedVehicles[0].id);
      }
    };
    fetchData();
  }, []);

  const handleChangeVehicle = async (id: string) => {
    setSelectedVehicleId(id);
    setIsVehicleMenuOpen(false);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('profiles').update({ last_selected_vehicle_id: id }).eq('id', session.user.id);
    }
  };

  // === 3. FETCH DADOS GLOBAIS DE COMBUSTÍVEL ===
  useEffect(() => {
    if (!selectedVehicleId) return;

    const fetchFuelStats = async () => {
       const { data } = await supabase
         .from('transactions')
         .select('*')
         .eq('vehicle_id', selectedVehicleId)
         .eq('type', 'EXPENSE')
         .or('category.eq.FUEL, category.eq.Combustível, fuel_type.not.is.null') 
         .order('date', { ascending: false }) 
         .limit(50); 

       if (data && data.length > 0) {
          const lastWithPrice = data.find((t:any) => Number(t.price_per_liter) > 0);
          if (lastWithPrice) setLastFuelPrice(Number(lastWithPrice.price_per_liter));

          const efficiency = calculateTankToTankEfficiency(data);
          setVehicleRealAvg(efficiency);
       } else {
          setLastFuelPrice(0);
          setVehicleRealAvg(0);
       }
    };

    fetchFuelStats();
  }, [selectedVehicleId]);

  // === 4. BUSCAR TRANSAÇÕES E CALCULAR ===
  useEffect(() => {
    if (!selectedVehicleId) return;
    
    setLoading(true);
    const { start, end } = getStartEndDates(currentDate, timeFilter);
    
    const fetchTransactions = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('vehicle_id', selectedVehicleId)
        .gte('date', start.toISOString())
        .lte('date', end.toISOString())
        .order('date', { ascending: true });

      if (error) {
        console.error("Erro ao buscar transações:", error);
        setLoading(false);
        return;
      }

      const mappedTransactions: Transaction[] = (data || []).map((t: any) => {
        const amount = Number(t.amount) / 100;
        const split = t.split && Array.isArray(t.split) 
            ? t.split.map((s: any) => ({ ...s, amount: Number(s.amount) / 100 })) 
            : t.split;

        return {
          id: t.id,
          userId: t.user_id,
          vehicleId: t.vehicle_id,
          type: t.type,
          amount: amount, 
          date: t.date,
          distanceDriven: Number(t.distance ?? t.distance_driven ?? 0), 
          onlineDurationMinutes: Number(t.duration ?? t.online_duration_minutes ?? 0),
          tripsCount: Number(t.trip_count ?? t.trips_count ?? 0),
          description: t.notes || t.description,
          clusterKmPerLiter: Number(t.cluster_km_per_liter ?? 0),
          platform: t.platform,
          split: split,
          category: t.category,
          fuelType: t.fuel_type,
          liters: t.liters ? Number(t.liters) : undefined,
          pricePerLiter: t.price_per_liter ? Number(t.price_per_liter) : undefined,
          isFullTank: t.is_full_tank,
          stationName: t.station_name,
          odometer: Number(t.odometer ?? 0),
          createdAt: t.created_at
        } as Transaction;
      });

      setTransactions(mappedTransactions);
      calculateMetrics(mappedTransactions);
      setLoading(false);
    };

    fetchTransactions();
  }, [currentDate, timeFilter, lastFuelPrice, vehicleRealAvg, selectedVehicleId]); 

  // === 5. CÁLCULO DE MÉTRICAS ===
  const calculateMetrics = (data: Transaction[]) => {
    let income = 0;
    let expense = 0;
    let km = 0;
    let minutes = 0;
    let trips = 0; 
    let sumClusterAvg = 0;
    let countClusterEntries = 0;
    let maintenanceExpenses = 0;
    
    const platformIncome: Record<string, number> = {};
    const dailyMap = new Map();

    data.forEach(t => {
      const val = t.amount; 
      const tDate = new Date(t.date);
      const dateKey = tDate.getUTCDate();

      if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, { day: dateKey, income: 0, expense: 0 });
      const dayData = dailyMap.get(dateKey);

      if (t.type === 'INCOME') {
        const inc = t as IncomeTransaction;
        income += val;
        dayData.income += val;
        km += Number(inc.distanceDriven || 0);
        minutes += Number(inc.onlineDurationMinutes || 0);
        trips += Number(inc.tripsCount || 0);

        if (inc.clusterKmPerLiter && inc.clusterKmPerLiter > 0) {
          sumClusterAvg += Number(inc.clusterKmPerLiter);
          countClusterEntries++;
        }

        if (inc.platform === 'MULTIPLE' && inc.split && inc.split.length > 0) {
           inc.split.forEach(item => {
              platformIncome[item.platform] = (platformIncome[item.platform] || 0) + item.amount;
           });
        } else if (inc.platform) {
           platformIncome[inc.platform] = (platformIncome[inc.platform] || 0) + val;
        }

      } else if (t.type === 'EXPENSE') {
        const exp = t as FuelTransaction;
        expense += val;
        dayData.expense += val;
        
        const isFuel = exp.category === ExpenseCategory.FUEL || exp.category === 'FUEL' || exp.category === 'Combustível' || (t as any).fuelType;
        if (!isFuel) {
           maintenanceExpenses += val;
        }
      }
    });

    const profit = income - expense; 
    const hours = minutes / 60;
    const avgTicket = trips > 0 ? (income / trips) : 0;
    const tripsPerHour = hours > 0 ? (trips / hours) : 0;
    
    const clusterAvg = countClusterEntries > 0 ? (sumClusterAvg / countClusterEntries) : 0;
    const isRealAvgReliable = vehicleRealAvg > 0;
    let fuelCostPerKmPump = 0;

    const calcAvg = isRealAvgReliable ? vehicleRealAvg : clusterAvg;

    if (calcAvg > 0 && lastFuelPrice > 0) {
      fuelCostPerKmPump = lastFuelPrice / calcAvg;
    }

    let fuelCostPerKmPanel = 0;
    if (clusterAvg > 0 && lastFuelPrice > 0) {
      fuelCostPerKmPanel = lastFuelPrice / clusterAvg;
    }

    const maintenanceCostPerKm = km > 0 ? (maintenanceExpenses / km) : 0;
    const totalCostPerKm = fuelCostPerKmPump + maintenanceCostPerKm;
    const totalOperationalCost = (totalCostPerKm * km); 
    
    const realProfitPerHour = hours > 0 ? ((income - totalOperationalCost) / hours) : 0;
    const realProfitPerKm = km > 0 ? ((income - totalOperationalCost) / km) : 0;
    const grossPerHour = hours > 0 ? income / hours : 0;
    const grossPerKm = km > 0 ? income / km : 0;
    
    const activeDays = dailyMap.size || 1;
    const avgDailyIncome = income / activeDays;

    let bestApp = { name: '-', amount: 0 };
    Object.entries(platformIncome).forEach(([name, amount]) => {
      if (amount > bestApp.amount) bestApp = { name, amount };
    });

    setMetrics({
      income, expense, profit, km, hours, trips,
      avgTicket, tripsPerHour,
      profitPerHour: realProfitPerHour, 
      profitPerKm: realProfitPerKm, 
      fuelCostPerKmPanel, 
      fuelCostPerKmPump,
      maintenanceCostPerKm,
      grossPerHour, grossPerKm, avgDailyIncome, 
      clusterAvg, 
      realAvg: vehicleRealAvg, 
      isRealAvgReliable, 
      bestApp
    });

    setChartData(Array.from(dailyMap.values()).sort((a, b) => a.day - b.day));
  };

  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  
  // === FORMATADOR DE TÍTULO ===
  const formatTitle = () => {
    if (timeFilter === 'WEEK') {
        const { start, end } = getStartEndDates(currentDate, 'WEEK');
        const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
        return `${fmt(start)} - ${fmt(end)}`;
    }
    const opts: Intl.DateTimeFormatOptions = timeFilter === 'MONTH' 
        ? { month: 'long', year: 'numeric' } 
        : { day: 'numeric', month: 'long', year: 'numeric' }; 
    return currentDate.toLocaleDateString('pt-BR', opts);
  };

  // === HANDLERS PARA CALENDÁRIO ===
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split('-').map(Number);
    if (timeFilter === 'MONTH') {
        setCurrentDate(new Date(y, m - 1, 1));
    } else {
        setCurrentDate(new Date(y, m - 1, d || 1));
    }
  };

  const getInputValue = () => {
     const y = currentDate.getFullYear();
     const m = String(currentDate.getMonth() + 1).padStart(2, '0');
     const d = String(currentDate.getDate()).padStart(2, '0');
     if (timeFilter === 'MONTH') return `${y}-${m}`;
     return `${y}-${m}-${d}`;
  };

  const handleOpenPicker = () => {
    try {
      if (dateInputRef.current && typeof dateInputRef.current.showPicker === 'function') {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current?.focus();
        dateInputRef.current?.click();
      }
    } catch (err) {
      console.error("Error opening date picker:", err);
    }
  };

  const currentVehicle = vehicles.find(v => v.id === selectedVehicleId);

  return (
    <div className="space-y-6 md:space-y-8 pb-24 animate-fade-in px-4 md:px-0">
      
      {/* =========================================================== */}
      {/* HEADER MOBILE - EXIBE APENAS EM MOBILE (md:hidden) */}
      {/* =========================================================== */}
      <header className="flex md:hidden flex-col gap-4 mt-2 mb-2">
        {/* --- LINHA 1: SAUDAÇÃO E VEÍCULO (Estilo App) --- */}
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-xl text-gray-400 font-normal">
              {getGreeting()}, <span className="text-white font-bold">{userName}</span>
            </h1>
          </div>

          {/* Botão de Veículo (Mobile) */}
          <div className="relative z-50">
            <button 
              onClick={() => setIsVehicleMenuOpen(!isVehicleMenuOpen)}
              className="flex items-center gap-2 bg-gray-800/40 backdrop-blur-md border border-gray-700/50 hover:border-emerald-500/50 text-white rounded-full py-1.5 px-3 pl-2 transition-all shadow-lg active:scale-95"
            >
              {currentVehicle ? (
                <>
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-sm">
                      <img 
                        src={getBrandLogo(currentVehicle.brand)} 
                        alt={currentVehicle.brand}
                        onError={(e) => { e.currentTarget.src = "/logos/brands/generic.png" }} 
                        className="w-full h-full object-contain"
                      />
                  </div>
                  <ChevronDown size={14} className={`text-gray-400 mr-1 transition-transform ${isVehicleMenuOpen ? 'rotate-180' : ''}`} />
                </>
              ) : (
                <div className="w-8 h-8 bg-gray-700 rounded-full animate-pulse"/>
              )}
            </button>

            {isVehicleMenuOpen && (
              <div className="absolute top-full right-0 mt-3 w-[260px] bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[60]">
                 <div className="p-3 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Meus Veículos
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                  {vehicles.map(v => (
                    <button
                      key={v.id}
                      onClick={() => handleChangeVehicle(v.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${selectedVehicleId === v.id ? 'bg-emerald-500/10 border border-emerald-500/20' : 'hover:bg-white/5 border border-transparent'}`}
                    >
                        <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center p-1 shrink-0 shadow-sm">
                            <img src={getBrandLogo(v.brand)} alt={v.brand} className="w-full h-full object-contain" />
                        </div>
                        <div className="text-left">
                            <p className={`font-bold text-sm ${selectedVehicleId === v.id ? 'text-emerald-400' : 'text-white'}`}>{v.name}</p>
                            <p className="text-gray-500 text-[10px] uppercase font-medium">{v.brand} {v.model}</p>
                        </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- LINHA 2: CONTROLES UNIFICADOS MOBILE --- */}
        <div className="bg-gray-800/20 backdrop-blur-md border border-white/5 p-1.5 rounded-2xl flex flex-col gap-2 shadow-inner">
           {/* Seletor de Período */}
           <div className="flex bg-gray-900/50 rounded-xl p-1 relative">
             {(['DAY', 'WEEK', 'MONTH'] as TimeFilter[]).map(t => (
               <button 
                 key={t} 
                 onClick={() => setTimeFilter(t)} 
                 className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 relative z-10 ${
                   timeFilter === t 
                   ? 'text-white bg-gray-700 shadow-md'
                   : 'text-gray-500 hover:text-gray-300'
                 }`}
               >
                 {t === 'DAY' ? 'Dia' : t === 'WEEK' ? 'Semana' : 'Mês'}
               </button>
             ))}
           </div>
           
           {/* Navegador de Data Mobile */}
           <div className="flex items-center justify-between px-2 py-1">
             <button 
               onClick={() => navigateDate('prev')} 
               className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
             >
               <ChevronLeft size={22} />
             </button>
             
             {/* DATA CLICÁVEL MOBILE (Chama handleOpenPicker) */}
             <button 
               onClick={handleOpenPicker}
               className="relative flex-1 flex flex-col items-center justify-center cursor-pointer py-2 group bg-transparent border-none"
             >
               <span className="text-emerald-400 font-bold capitalize select-none text-base flex items-center gap-2 group-active:scale-95 transition-transform">
                 <Calendar size={16} className="opacity-80"/>
                 {formatTitle()}
               </span>
               <span className="text-[10px] text-gray-600 font-medium -mt-0.5 group-hover:text-gray-500 transition-colors">Toque para mudar</span>
             </button>

             <button 
               onClick={() => navigateDate('next')} 
               className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
             >
               <ChevronRight size={22} />
             </button>
           </div>
        </div>
      </header>


      {/* =========================================================== */}
      {/* HEADER DESKTOP - EXIBE APENAS EM MD+ */}
      {/* =========================================================== */}
      <header className="hidden md:flex md:items-end justify-between gap-4 mt-4">
        <div>
          {/* SAUDAÇÃO DESKTOP */}
          <h1 className="text-3xl font-normal text-gray-400 flex items-center gap-2">
            {getGreeting()}, <span className="text-white font-bold">{userName}</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Acompanhe seus indicadores.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           {/* SELETOR DE VEÍCULO DESKTOP */}
           <div className="relative z-50">
              <button 
                onClick={() => setIsVehicleMenuOpen(!isVehicleMenuOpen)}
                className="flex items-center gap-3 bg-gray-900 border border-gray-800 hover:border-emerald-500/50 text-white rounded-xl py-2 px-4 transition-all shadow-lg min-w-[200px]"
              >
                {currentVehicle ? (
                  <>
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1 overflow-hidden shrink-0">
                       <img 
                          src={getBrandLogo(currentVehicle.brand)} 
                          alt={currentVehicle.brand}
                          onError={(e) => { e.currentTarget.src = "/logos/brands/generic.png" }} 
                          className="w-full h-full object-contain"
                       />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                       <p className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1 truncate">{currentVehicle.brand}</p>
                       <p className="text-sm font-bold leading-none truncate">{currentVehicle.model}</p>
                    </div>
                    <ChevronDown size={18} className={`text-gray-500 transition-transform ${isVehicleMenuOpen ? 'rotate-180' : ''}`} />
                  </>
                ) : (
                  <span className="text-sm text-gray-400">Carregando...</span>
                )}
              </button>

              {isVehicleMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-full min-w-[260px] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 z-[60]">
                  <div className="py-2">
                    {vehicles.map(v => (
                      <button
                        key={v.id}
                        onClick={() => handleChangeVehicle(v.id)}
                        className={`w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-800 transition-colors ${selectedVehicleId === v.id ? 'bg-gray-800 border-l-4 border-emerald-500' : ''}`}
                      >
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1 shrink-0 shadow-sm">
                             <img src={getBrandLogo(v.brand)} alt={v.brand} className="w-full h-full object-contain" />
                          </div>
                          <div className="text-left">
                             <p className="text-white font-bold text-base">{v.name}</p>
                             <p className="text-gray-500 text-xs uppercase font-medium">{v.brand} {v.model}</p>
                          </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
           </div>

           <div className="h-8 w-px bg-gray-800 hidden md:block"></div>

           {/* FILTROS DE TEMPO DESKTOP */}
           <div className="bg-gray-900 p-1 rounded-xl flex border border-gray-800">
              {(['DAY', 'WEEK', 'MONTH'] as TimeFilter[]).map(t => (
                <button key={t} onClick={() => setTimeFilter(t)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeFilter === t ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                  {t === 'DAY' ? 'Dia' : t === 'WEEK' ? 'Semana' : 'Mês'}
                </button>
              ))}
           </div>
           
           {/* NAVEGAÇÃO DE DATA DESKTOP */}
           <div className="bg-gray-900 border border-gray-800 rounded-xl p-1 flex items-center shadow-lg relative">
              <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"><ChevronLeft size={20} /></button>
              
              {/* DATA CLICÁVEL DESKTOP */}
              <button 
                  onClick={handleOpenPicker}
                  className="flex items-center gap-2 px-4 min-w-[120px] justify-center text-emerald-400 font-bold capitalize select-none text-sm hover:text-emerald-300 cursor-pointer transition-colors bg-transparent border-none"
              >
                  <Calendar size={16} />{formatTitle()}
                  
                  {/* INPUT DATE OCULTO - Ancorado aqui no Desktop para abrir embaixo */}
                  <input 
                      ref={dateInputRef}
                      type={timeFilter === 'MONTH' ? 'month' : 'date'}
                      className="sr-only" // Invisível mas funcional
                      style={{ colorScheme: "dark" }} // FORÇA O DARK MODE NO CALENDÁRIO NATIVO
                      onChange={handleDateChange}
                      value={getInputValue()}
                      aria-label="Selecionar data"
                  />
              </button>

              <button onClick={() => navigateDate('next')} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"><ChevronRight size={20} /></button>
           </div>
        </div>
      </header>

      {/* === LINHA 1: FINANCEIRO GERAL (CAIXA) === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SmartCard 
            title="Lucro Líquido (Caixa)" 
            value={formatMoney(metrics.profit)} 
            subtitle={metrics.profit >= 0 ? "Entradas - Saídas" : "Prejuízo no período"} 
            icon={Wallet} 
            color={metrics.profit >= 0 ? "emerald" : "red"} 
            highlight={true} 
        />
        <SmartCard 
            title="Faturamento Total" 
            value={formatMoney(metrics.income)} 
            subtitle="Soma bruta de ganhos" 
            icon={TrendingUp} 
            color="blue" 
        />
        <SmartCard 
            title="Despesas Totais" 
            value={formatMoney(metrics.expense)} 
            subtitle="Combustível + Manutenção" 
            icon={TrendingDown} 
            color="red" 
        />
      </div>

      {/* === LINHA 2: PRODUTIVIDADE (BRUTO) === */}
      <div className="space-y-3">
        <h2 className="text-white font-bold text-sm flex items-center gap-2 uppercase tracking-wide opacity-80">
            <Target size={16} className="text-purple-500"/> Produtividade Bruta
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
           <SmartCard title="Ganho/Hora" value={formatMoney(metrics.grossPerHour)} subtitle="Faturamento Bruto" icon={Clock} color="indigo" />
           <SmartCard title="Ganho/KM" value={formatMoney(metrics.grossPerKm)} subtitle="Faturamento Bruto" icon={MapPin} color="violet" />
           <SmartCard title="Média Diária" value={formatMoney(metrics.avgDailyIncome)} subtitle="Dias trabalhados" icon={Calendar} color="pink" />
           <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-lg relative overflow-hidden group hover:border-gray-700 transition-all">
              <div className="flex justify-between items-start mb-3">
                 <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"><Trophy size={22} /></div>
              </div>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Melhor App</p>
              <h3 className="text-xl font-bold text-white mt-0.5 mb-0.5 capitalize truncate">
                 {metrics.bestApp.amount > 0 ? (
                    Platform[metrics.bestApp.name as keyof typeof Platform] || metrics.bestApp.name
                 ) : '-'}
              </h3>
              <p className="text-[10px] text-gray-500">{formatMoney(metrics.bestApp.amount)}</p>
           </div>
        </div>
      </div>

      {/* === LINHA 3: EFICIÊNCIA REAL (OPERACIONAL + CUSTOS) === */}
      <div className="space-y-3">
        <h2 className="text-white font-bold text-sm flex items-center gap-2 uppercase tracking-wide opacity-80">
            <Zap size={16} className="text-yellow-500"/> Eficiência Real & Operacional
        </h2>
        
        {/* CARDS DE CORRIDAS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <SmartCard 
            title="Corridas" 
            value={metrics.trips.toString()} 
            subtitle="Viagens finalizadas" 
            icon={Hash} 
            color="cyan" 
          />
          <SmartCard 
            title="Média/Corrida" 
            value={formatMoney(metrics.avgTicket)} 
            subtitle="Ticket Médio" 
            icon={DollarSign} 
            color="emerald" 
          />
          <SmartCard 
            title="Corridas/Hora" 
            value={metrics.tripsPerHour.toFixed(1)} 
            subtitle="Ritmo de trabalho" 
            icon={Clock} 
            color="lime" 
          />
          <SmartCard 
            title="Lucro Real/Hora" 
            value={formatMoney(metrics.profitPerHour)} 
            subtitle="Desc. Combustível/Manut." 
            icon={Target} 
            color="emerald" 
          />
        </div>

        {/* CARDS DE CUSTOS POR KM */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SmartCard 
            title="Custo Gas./KM (Painel)" 
            value={formatMoney(metrics.fuelCostPerKmPanel)} 
            subtitle={metrics.clusterAvg > 0 ? `Média Painel: ${metrics.clusterAvg.toFixed(1)} km/l` : 'Informe a média no ganho'} 
            icon={Gauge} 
            color="orange" 
          />
          
          {/* Card Inteligente de Custo Real */}
          <SmartCard 
            title="Custo Gas./KM (Bomba)" 
            value={formatMoney(metrics.fuelCostPerKmPump)} 
            subtitle={
                metrics.isRealAvgReliable 
                ? `Média Real: ${metrics.realAvg.toFixed(1)} km/l` 
                : 'Dados insuficientes (Use Painel)'
            } 
            icon={Fuel} 
            color={metrics.isRealAvgReliable ? "amber" : "gray"}
            alert={!metrics.isRealAvgReliable}
          />
          
           <SmartCard 
            title="Outros Custos/KM" 
            value={formatMoney(metrics.maintenanceCostPerKm)} 
            subtitle="Manutenção, etc." 
            icon={Wrench} 
            color="red" 
          />
           <SmartCard 
            title="Lucro Real/KM" 
            value={formatMoney(metrics.profitPerKm)} 
            subtitle="Margem final por km" 
            icon={MapPin} 
            color="teal" 
          />
        </div>
      </div>

      {/* === GRÁFICO DE BARRAS (DIÁRIO) === */}
      <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 h-96 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">Fluxo de Caixa (Diário)</h3>
          <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">{transactions.length} registros</span>
        </div>
        
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-600 animate-pulse">Carregando dados...</div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 border border-dashed border-gray-800 rounded-xl bg-gray-900/50">
            <AlertCircle className="mb-2 h-8 w-8 opacity-50"/>
            <p className="text-sm">Nenhum registro encontrado em</p>
            <p className="font-bold text-gray-500 capitalize">{formatTitle()}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="day" stroke="#6b7280" tickLine={false} axisLine={false} tickFormatter={(val) => `${val}`} dy={10} fontSize={12} />
              <YAxis stroke="#6b7280" tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} fontSize={12} />
              <Tooltip cursor={{fill: '#374151', opacity: 0.2}} content={<CustomTooltip />} />
              <Bar dataKey="income" name="Ganhos" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {chartData.map((e, i) => <Cell key={`inc-${i}`} fill="#10b981" />)}
              </Bar>
              <Bar dataKey="expense" name="Despesas" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {chartData.map((e, i) => <Cell key={`exp-${i}`} fill="#ef4444" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="pt-4">
         <OdometerChart transactions={transactions} />
      </div>

    </div>
  );
}