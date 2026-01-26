// app/routes/dashboard.tsx

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from "firebase/firestore";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { 
  TrendingUp, TrendingDown, Wallet, MapPin, AlertCircle, ChevronLeft, ChevronRight, 
  Calendar, Clock, Zap, Gauge, Fuel, Trophy, Target, Wrench, Hash, DollarSign, Car
} from "lucide-react";
import { db, auth } from "~/lib/firebase.client";
// CORREÇÃO 1: Removido FuelTransaction da importação, pois não existe no models.ts
import type { Transaction, IncomeTransaction, ExpenseTransaction, Vehicle } from "~/types/models";
import { ExpenseCategory } from "~/types/enums";
import { OdometerChart } from "~/components/OdometerChart"; 

// Tipos
type TimeFilter = 'DAY' | 'WEEK' | 'MONTH';

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
  
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastFuelPrice, setLastFuelPrice] = useState<number>(0); 
  
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('MONTH');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Métricas
  const [metrics, setMetrics] = useState({
    income: 0, expense: 0, profit: 0,
    km: 0, hours: 0,
    trips: 0, 
    
    // Indicadores Operacionais
    avgTicket: 0,    // Valor médio por corrida
    tripsPerHour: 0, // Corridas por hora
    
    // Custos/Eficiência
    profitPerHour: 0, profitPerKm: 0, 
    fuelCostPerKmPanel: 0,   // Baseado no Painel (Estimado)
    fuelCostPerKmPump: 0,    // Baseado na Bomba (Histórico)
    maintenanceCostPerKm: 0, // Outros custos
    
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

  // 1. Carregar Veículos (Para o filtro)
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, "vehicles"), where("userId", "==", auth.currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Vehicle[];
      setVehicles(data);
      if (data.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(data[0].id);
      }
    });
    return () => unsub();
  }, []);

  // 2. Buscar último preço de combustível DO VEÍCULO SELECIONADO
  useEffect(() => {
    if (!auth.currentUser || !selectedVehicleId) return;
    
    const fetchLastFuel = async () => {
      const q = query(
        collection(db, "transactions"),
        where("userId", "==", auth.currentUser?.uid),
        where("vehicleId", "==", selectedVehicleId),
        where("type", "==", "EXPENSE"),
        orderBy("date", "desc"),
        limit(10) 
      );
      
      try {
        const snap = await getDocs(q);
        // CORREÇÃO 2: Tipagem correta para ExpenseTransaction
        const fuelTrans = snap.docs
          .map(d => d.data() as ExpenseTransaction)
          .find(t => t.pricePerLiter && t.pricePerLiter > 0);
        
        if (fuelTrans && fuelTrans.pricePerLiter) {
          setLastFuelPrice(fuelTrans.pricePerLiter);
        } else {
          setLastFuelPrice(0);
        }
      } catch (error) {
        console.error("Erro ao buscar preço combustível:", error);
      }
    };
    
    fetchLastFuel();
  }, [selectedVehicleId]);

  // 3. Buscar Transações e Calcular Métricas
  useEffect(() => {
    if (!auth.currentUser || !selectedVehicleId) return;
    
    setLoading(true);
    const { start, end } = getStartEndDates(currentDate, timeFilter);
    
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", auth.currentUser.uid),
      where("vehicleId", "==", selectedVehicleId),
      where("date", ">=", start.toISOString()),
      where("date", "<=", end.toISOString()),
      orderBy("date", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
      setTransactions(data);
      calculateMetrics(data, start, end);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentDate, timeFilter, lastFuelPrice, selectedVehicleId]);

  const calculateMetrics = (data: Transaction[], start: Date, end: Date) => {
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
      const val = t.amount / 100;
      const dateKey = new Date(t.date).getDate();

      if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, { day: dateKey, income: 0, expense: 0 });
      const dayData = dailyMap.get(dateKey);

      if (t.type === 'INCOME') {
        income += val;
        dayData.income += val;
        
        const inc = t as IncomeTransaction;
        platformIncome[inc.platform] = (platformIncome[inc.platform] || 0) + val;

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
        
        // CORREÇÃO 3: Comparação segura de Enum com conversão 'as string' para legado
        const categoryStr = exp.category as string; 
        const isFuel = exp.category === ExpenseCategory.FUEL || categoryStr === 'Combustível' || categoryStr === 'FUEL';
        
        if (isFuel) {
           // Como ExpenseTransaction tem os campos de fuel opcionais, usamos direto
           if (exp.liters) totalLitersRefueled += exp.liters;
        } else {
           maintenanceExpenses += val;
        }
      }
    });

    const profit = income - expense; 
    const hours = minutes / 60;
    
    // === MÉDIAS OPERACIONAIS ===
    const avgTicket = trips > 0 ? (income / trips) : 0;
    const tripsPerHour = hours > 0 ? (trips / hours) : 0;

    // === MÉDIAS DE CONSUMO ===
    const realAvg = totalLitersRefueled > 0 ? (km / totalLitersRefueled) : 0;
    const clusterAvg = countClusterEntries > 0 ? (sumClusterAvg / countClusterEntries) : 0;

    // === CUSTOS POR KM ===
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

  return (
    <div className="space-y-8 pb-24 animate-fade-in px-4 md:px-0">
      
      {/* === HEADER === */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">Visão Geral</h1>
          <p className="text-gray-400 mt-1 text-sm">Acompanhe suas metas e eficiência.</p>
        </div>

        <div className="flex flex-col gap-3">
           {/* SELETOR DE VEÍCULO */}
           <div className="relative">
              <Car className="absolute left-3 top-2.5 text-gray-500" size={16} />
              <select 
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl py-2 pl-9 pr-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer hover:bg-gray-800 transition-colors"
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
           </div>

           <div className="flex gap-2">
             <div className="bg-gray-900 p-1 rounded-xl flex border border-gray-800 self-start">
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

      {/* === NOVO: GRÁFICO DE ODÔMETRO (Evolução do KM) === */}
      <div className="pt-4">
         <OdometerChart transactions={transactions} />
      </div>

    </div>
  );
}