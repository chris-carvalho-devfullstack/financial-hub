// app/routes/dashboard.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { 
  TrendingUp, TrendingDown, Wallet, MapPin, AlertCircle, ChevronLeft, ChevronRight, 
  Calendar, Clock, Zap, Gauge, Fuel, Trophy, Target, Wrench, Hash, DollarSign, Car,
  ChevronDown 
} from "lucide-react";
import { supabase } from "~/lib/supabase.client"; // ✅ Supabase Client
import type { Transaction, IncomeTransaction, ExpenseTransaction, Vehicle } from "~/types/models";
import { ExpenseCategory } from "~/types/enums";
import { OdometerChart } from "~/components/OdometerChart"; 

// Tipos
type TimeFilter = 'DAY' | 'WEEK' | 'MONTH';

// === HELPER: LOGO DO VEÍCULO ===
const getBrandLogo = (brand: string) => {
  if (!brand) return "/logos/brands/generic.png";
  const safeBrand = brand.toLowerCase().trim().replace(/\s+/g, '-');
  return `/logos/brands/${safeBrand}.png`;
};

// === HELPER: DATA ===
const getStartEndDates = (date: Date, filter: TimeFilter) => {
  const start = new Date(date);
  const end = new Date(date);

  if (filter === 'DAY') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (filter === 'WEEK') {
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
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

// === TOOLTIP ===
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

// === SMART CARD ===
function SmartCard({ title, value, subtitle, icon: Icon, color, highlight = false }: any) {
  return (
    <div className={`
      relative p-5 rounded-2xl border shadow-lg overflow-hidden group hover:border-gray-600 transition-all
      ${highlight ? `bg-${color}-900/10 border-${color}-500/30` : 'bg-gray-900 border-gray-800'}
    `}>
      <div className={`absolute -right-6 -top-6 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity bg-${color}-500 rounded-full blur-2xl`}></div>
      <div className="flex justify-between items-start mb-3">
         <div className={`p-2.5 rounded-xl bg-${color}-500/10 text-${color}-500 border border-${color}-500/20`}>
            <Icon size={22} />
         </div>
      </div>
      <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{title}</p>
      <h3 className="text-xl md:text-2xl font-bold text-white mt-0.5 mb-0.5 truncate">{value}</h3>
      <p className="text-[10px] text-gray-500 truncate">{subtitle}</p>
    </div>
  );
}

export default function Dashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [isVehicleMenuOpen, setIsVehicleMenuOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastFuelPrice, setLastFuelPrice] = useState<number>(0); 
  
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('MONTH');
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigate = useNavigate();

  // Métricas
  const [metrics, setMetrics] = useState({
    income: 0, expense: 0, profit: 0,
    km: 0, hours: 0,
    trips: 0, 
    avgTicket: 0, tripsPerHour: 0,
    profitPerHour: 0, profitPerKm: 0, 
    fuelCostPerKmPanel: 0, fuelCostPerKmPump: 0, maintenanceCostPerKm: 0,
    grossPerHour: 0, grossPerKm: 0, avgDailyIncome: 0,
    clusterAvg: 0, realAvg: 0,
    bestApp: { name: '-', amount: 0 }
  });

  const [chartData, setChartData] = useState<any[]>([]);

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    const method = direction === 'next' ? 1 : -1;
    if (timeFilter === 'DAY') newDate.setDate(newDate.getDate() + method);
    if (timeFilter === 'WEEK') newDate.setDate(newDate.getDate() + (method * 7));
    if (timeFilter === 'MONTH') newDate.setMonth(newDate.getMonth() + method);
    setCurrentDate(newDate);
  };

  // 1. Carregar Veículos e Preferência do Usuário (Supabase)
  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return; 

      // Busca Veículos
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', session.user.id);

      if (vehiclesError) {
        console.error("Erro ao buscar veículos:", vehiclesError);
        return;
      }

      // Mapeia snake_case (banco) para camelCase (frontend)
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

      // Busca Preferência no Perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('last_selected_vehicle_id')
        .eq('id', session.user.id)
        .single();

      // Lógica de Seleção: Perfil > Primeiro da Lista > Nada
      if (profileData?.last_selected_vehicle_id && mappedVehicles.find(v => v.id === profileData.last_selected_vehicle_id)) {
        setSelectedVehicleId(profileData.last_selected_vehicle_id);
      } else if (mappedVehicles.length > 0) {
        setSelectedVehicleId(mappedVehicles[0].id);
      }
    };

    fetchData();
  }, []);

  // Função para trocar veículo e PERSISTIR NO SERVIDOR
  const handleChangeVehicle = async (id: string) => {
    setSelectedVehicleId(id);
    setIsVehicleMenuOpen(false);
    
    // Atualiza no banco de dados para persistir entre dispositivos
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('profiles')
        .update({ last_selected_vehicle_id: id })
        .eq('id', session.user.id);
    }
  };

  // 2. Buscar último preço de combustível (Supabase)
  useEffect(() => {
    if (!selectedVehicleId) return;
    
    const fetchLastFuel = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('price_per_liter')
        .eq('vehicle_id', selectedVehicleId)
        .eq('type', 'EXPENSE')
        .gt('price_per_liter', 0) 
        .order('date', { ascending: false })
        .limit(1);
      
      if (!error && data && data.length > 0) {
        setLastFuelPrice(Number(data[0].price_per_liter));
      } else {
        setLastFuelPrice(0);
      }
    };
    
    fetchLastFuel();
  }, [selectedVehicleId]);

  // 3. Buscar Transações e Calcular Métricas (Supabase)
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

      const mappedTransactions: Transaction[] = (data || []).map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        vehicleId: t.vehicle_id,
        type: t.type,
        amount: Number(t.amount),
        date: t.date,
        description: t.description,
        platform: t.platform,
        distanceDriven: t.distance_driven,
        onlineDurationMinutes: t.online_duration_minutes,
        tripsCount: t.trips_count,
        split: t.split,
        clusterKmPerLiter: t.cluster_km_per_liter,
        category: t.category,
        fuelType: t.fuel_type,
        liters: t.liters ? Number(t.liters) : undefined,
        pricePerLiter: t.price_per_liter ? Number(t.price_per_liter) : undefined,
        isFullTank: t.is_full_tank,
        createdAt: t.created_at
      })) as Transaction[];

      setTransactions(mappedTransactions);
      calculateMetrics(mappedTransactions);
      setLoading(false);
    };

    fetchTransactions();
  }, [currentDate, timeFilter, lastFuelPrice, selectedVehicleId]);

  const calculateMetrics = (data: Transaction[]) => {
    let income = 0;
    let expense = 0;
    let km = 0;
    let minutes = 0;
    let totalLitersRefueled = 0;
    let sumClusterAvg = 0;
    let countClusterEntries = 0;
    let trips = 0; 
    let maintenanceExpenses = 0; 
    
    const platformIncome: Record<string, number> = {};
    const dailyMap = new Map();

    data.forEach(t => {
      const val = t.amount; // Supabase retorna número correto
      const tDate = new Date(t.date);
      const dateKey = tDate.getUTCDate(); 

      if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, { day: dateKey, income: 0, expense: 0 });
      const dayData = dailyMap.get(dateKey);

      if (t.type === 'INCOME') {
        income += val;
        dayData.income += val;
        
        const inc = t as IncomeTransaction;

        if (inc.platform === 'MULTIPLE' && inc.split && inc.split.length > 0) {
           inc.split.forEach(item => {
              const itemVal = item.amount; 
              platformIncome[item.platform] = (platformIncome[item.platform] || 0) + itemVal;
           });
        } else if (inc.platform) {
           platformIncome[inc.platform] = (platformIncome[inc.platform] || 0) + val;
        }

        if (inc.distanceDriven) km += Number(inc.distanceDriven);
        if (inc.onlineDurationMinutes) minutes += Number(inc.onlineDurationMinutes);
        if (inc.tripsCount) trips += Number(inc.tripsCount);
        
        if (inc.clusterKmPerLiter && inc.clusterKmPerLiter > 0) {
          sumClusterAvg += Number(inc.clusterKmPerLiter);
          countClusterEntries++;
        }
      } else {
        expense += val;
        dayData.expense += val;
        
        const exp = t as ExpenseTransaction;
        const categoryStr = exp.category as string; 
        const isFuel = exp.category === ExpenseCategory.FUEL || categoryStr === 'Combustível' || categoryStr === 'FUEL';
        
        if (isFuel) {
           if (exp.liters) totalLitersRefueled += Number(exp.liters);
        } else {
           maintenanceExpenses += val;
        }
      }
    });

    const profit = income - expense; 
    const hours = minutes / 60;
    
    const avgTicket = trips > 0 ? (income / trips) : 0;
    const tripsPerHour = hours > 0 ? (trips / hours) : 0;

    const realAvg = totalLitersRefueled > 0 ? (km / totalLitersRefueled) : 0;
    const clusterAvg = countClusterEntries > 0 ? (sumClusterAvg / countClusterEntries) : 0;

    let fuelCostPerKmPanel = 0;
    if (clusterAvg > 0 && lastFuelPrice > 0) {
      fuelCostPerKmPanel = lastFuelPrice / clusterAvg;
    }

    let fuelCostPerKmPump = 0;
    if (realAvg > 0 && lastFuelPrice > 0) {
      fuelCostPerKmPump = lastFuelPrice / realAvg;
    }

    const maintenanceCostPerKm = km > 0 ? (maintenanceExpenses / km) : 0;
    const usedFuelCostPerKm = fuelCostPerKmPump > 0 ? fuelCostPerKmPump : fuelCostPerKmPanel;
    const totalOperationalCost = (usedFuelCostPerKm * km) + maintenanceExpenses;
    
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
      fuelCostPerKmPanel, fuelCostPerKmPump, maintenanceCostPerKm,
      grossPerHour, grossPerKm, avgDailyIncome, 
      clusterAvg, realAvg, bestApp
    });

    setChartData(Array.from(dailyMap.values()).sort((a, b) => a.day - b.day));
  };

  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatTitle = () => {
    const opts: Intl.DateTimeFormatOptions = timeFilter === 'MONTH' ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short' };
    return currentDate.toLocaleDateString('pt-BR', opts);
  };

  const currentVehicle = vehicles.find(v => v.id === selectedVehicleId);

  return (
    <div className="space-y-8 pb-24 animate-fade-in px-4 md:px-0">
      
      {/* === HEADER === */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">Visão Geral</h1>
          <p className="text-gray-400 mt-1 text-sm">Acompanhe suas metas e eficiência.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

           <div className="bg-gray-900 p-1 rounded-xl flex border border-gray-800">
              {(['DAY', 'WEEK', 'MONTH'] as TimeFilter[]).map(t => (
                <button key={t} onClick={() => setTimeFilter(t)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeFilter === t ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                  {t === 'DAY' ? 'Dia' : t === 'WEEK' ? 'Semana' : 'Mês'}
                </button>
              ))}
           </div>
           
           <div className="bg-gray-900 border border-gray-800 rounded-xl p-1 flex items-center shadow-lg">
              <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"><ChevronLeft size={20} /></button>
              <div className="flex items-center gap-2 px-4 min-w-[120px] justify-center text-emerald-400 font-bold capitalize select-none text-sm"><Calendar size={16} />{formatTitle()}</div>
              <button onClick={() => navigateDate('next')} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"><ChevronRight size={20} /></button>
           </div>
        </div>
      </header>

      {/* === LINHA 1: FINANCEIRO GERAL (CAIXA) === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SmartCard title="Lucro Líquido (Caixa)" value={formatMoney(metrics.profit)} subtitle={metrics.profit >= 0 ? "Fluxo de caixa real" : "Prejuízo no caixa"} icon={Wallet} color={metrics.profit >= 0 ? "emerald" : "red"} highlight={true} />
        <SmartCard title="Faturamento Total" value={formatMoney(metrics.income)} subtitle="Soma de todos os apps" icon={TrendingUp} color="blue" />
        <SmartCard title="Despesas Totais" value={formatMoney(metrics.expense)} subtitle="Todas saídas (Comb + Outros)" icon={TrendingDown} color="red" />
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
              <h3 className="text-xl font-bold text-white mt-0.5 mb-0.5 capitalize truncate">{metrics.bestApp.name.toLowerCase().replace('_', ' ')}</h3>
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
            subtitle="Descontando custos" 
            icon={Target} 
            color="emerald" 
          />
        </div>

        {/* CARDS DE CUSTOS POR KM */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SmartCard 
            title="Custo Gas./KM (Painel)" 
            value={formatMoney(metrics.fuelCostPerKmPanel)} 
            subtitle={metrics.clusterAvg > 0 ? `Base Painel: ${metrics.clusterAvg.toFixed(1)} km/l` : 'Informe a média no ganho'} 
            icon={Gauge} 
            color="orange" 
          />
          <SmartCard 
            title="Custo Gas./KM (Bomba)" 
            value={formatMoney(metrics.fuelCostPerKmPump)} 
            subtitle={metrics.realAvg > 0 ? `Base Bomba: ${metrics.realAvg.toFixed(1)} km/l` : 'Falta reabastecer'} 
            icon={Fuel} 
            color="amber" 
          />
           <SmartCard 
            title="Outros Custos/KM" 
            value={formatMoney(metrics.maintenanceCostPerKm)} 
            subtitle="Manutenção, Lanches..." 
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
          <h3 className="text-lg font-bold text-white">Desempenho Diário (Fluxo de Caixa)</h3>
          <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">{transactions.length} regs</span>
        </div>
        
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-600 animate-pulse">Carregando...</div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 border border-dashed border-gray-800 rounded-xl bg-gray-900/50">
            <AlertCircle className="mb-2 h-8 w-8 opacity-50"/>
            <p className="text-sm">Sem dados em</p>
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