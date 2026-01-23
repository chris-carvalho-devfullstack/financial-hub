// app/routes/dashboard.tsx

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from "firebase/firestore";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { 
  TrendingUp, TrendingDown, Wallet, MapPin, AlertCircle, ChevronLeft, ChevronRight, 
  Calendar, Clock, Zap, Car, Gauge, Fuel, Trophy, Target
} from "lucide-react";
import { db, auth } from "~/lib/firebase.client";
import type { Transaction, IncomeTransaction, FuelTransaction, ExpenseTransaction } from "~/types/models";
import { ExpenseCategory } from "~/types/enums";
// 👇 IMPORTANTE: Importando o gráfico que criamos
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
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastFuelPrice, setLastFuelPrice] = useState<number>(0); 
  
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('MONTH');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Métricas
  const [metrics, setMetrics] = useState({
    income: 0, expense: 0, profit: 0,
    km: 0, hours: 0,
    // Líquidos (Eficiência)
    profitPerHour: 0, profitPerKm: 0, costPerKm: 0,
    // Brutos (Produtividade)
    grossPerHour: 0, grossPerKm: 0, avgDailyIncome: 0,
    // Médias e Apps
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

  useEffect(() => {
    if (!auth.currentUser) return;
    const fetchLastFuel = async () => {
      const q = query(
        collection(db, "transactions"),
        where("userId", "==", auth.currentUser?.uid),
        where("type", "==", "EXPENSE"),
        orderBy("date", "desc"),
        limit(20)
      );
      const snap = await getDocs(q);
      const fuelTrans = snap.docs
        .map(d => d.data() as ExpenseTransaction)
        .find(t => t.category === ExpenseCategory.FUEL) as FuelTransaction | undefined;
      
      if (fuelTrans && fuelTrans.pricePerLiter) setLastFuelPrice(fuelTrans.pricePerLiter);
    };
    fetchLastFuel();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    setLoading(true);
    const { start, end } = getStartEndDates(currentDate, timeFilter);
    
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", auth.currentUser.uid),
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
  }, [currentDate, timeFilter, lastFuelPrice]);

  const calculateMetrics = (data: Transaction[], start: Date, end: Date) => {
    let income = 0;
    let expense = 0;
    let km = 0;
    let minutes = 0;
    let totalLitersRefueled = 0;
    let sumClusterAvg = 0;
    let countClusterEntries = 0;
    
    const platformIncome: Record<string, number> = {};
    const dailyMap = new Map();

    // Loop principal
    data.forEach(t => {
      const val = t.amount / 100;
      const dateKey = new Date(t.date).getDate();

      if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, { day: dateKey, income: 0, expense: 0 });
      const dayData = dailyMap.get(dateKey);

      if (t.type === 'INCOME') {
        income += val;
        dayData.income += val;
        
        // Dados para Best App
        const inc = t as IncomeTransaction;
        platformIncome[inc.platform] = (platformIncome[inc.platform] || 0) + val;

        if (inc.distanceDriven) km += Number(inc.distanceDriven);
        if (inc.onlineDurationMinutes) minutes += Number(inc.onlineDurationMinutes);
        if (inc.clusterKmPerLiter && inc.clusterKmPerLiter > 0) {
          sumClusterAvg += Number(inc.clusterKmPerLiter);
          countClusterEntries++;
        }
      } else {
        expense += val;
        dayData.expense += val;
        const exp = t as ExpenseTransaction;
        if (exp.category === ExpenseCategory.FUEL) {
           const fuel = t as FuelTransaction;
           if (fuel.liters) totalLitersRefueled += fuel.liters;
        }
      }
    });

    const profit = income - expense;
    const hours = minutes / 60;
    
    // Médias Gerais
    const realAvg = totalLitersRefueled > 0 ? (km / totalLitersRefueled) : 0;
    const clusterAvg = countClusterEntries > 0 ? (sumClusterAvg / countClusterEntries) : 0;

    // === CÁLCULOS BRUTOS (PRODUTIVIDADE) ===
    const grossPerHour = hours > 0 ? income / hours : 0;
    const grossPerKm = km > 0 ? income / km : 0;
    
    // Média Diária (Bruta)
    let daysCount = 1;
    if (timeFilter === 'WEEK') daysCount = 7;
    if (timeFilter === 'MONTH') daysCount = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(); 
    
    const activeDays = dailyMap.size || 1;
    const avgDailyIncome = income / activeDays;

    // === BEST APP ===
    let bestApp = { name: '-', amount: 0 };
    Object.entries(platformIncome).forEach(([name, amount]) => {
      if (amount > bestApp.amount) bestApp = { name, amount };
    });

    // === CUSTO POR KM (LÓGICA HÍBRIDA) ===
    let costPerKm = 0;
    if (timeFilter === 'DAY' && clusterAvg > 0 && lastFuelPrice > 0 && km > 0) {
      const price = lastFuelPrice;
      const fuelCost = (km / clusterAvg) * price;
      // Custo KM = (Gasolina Estimada + Outras Despesas) / KM
      costPerKm = (fuelCost + (expense > 0 ? expense : 0)) / km;
      // Ajuste fino: Se não teve despesa, é só o custo da gasolina
      if (expense === 0) costPerKm = price / clusterAvg;
    } else {
      costPerKm = km > 0 ? (expense / km) : 0;
    }

    // Líquidos
    const profitPerHour = hours > 0 ? (profit / hours) : 0;
    const profitPerKm = km > 0 ? (profit / km) : 0;

    setMetrics({
      income, expense, profit, km, hours,
      profitPerHour, profitPerKm, costPerKm,
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

        <div className="flex flex-col sm:flex-row gap-3">
           <div className="bg-gray-900 p-1 rounded-xl flex border border-gray-800 self-start">
              {(['DAY', 'WEEK', 'MONTH'] as TimeFilter[]).map(t => (
                <button key={t} onClick={() => setTimeFilter(t)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${timeFilter === t ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                  {t === 'DAY' ? 'Dia' : t === 'WEEK' ? 'Semana' : 'Mês'}
                </button>
              ))}
           </div>
           <div className="bg-gray-900 border border-gray-800 rounded-xl p-1 flex items-center shadow-lg">
              <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"><ChevronLeft size={20} /></button>
              <div className="flex items-center gap-2 px-4 min-w-[140px] justify-center text-emerald-400 font-bold capitalize select-none text-sm"><Calendar size={16} />{formatTitle()}</div>
              <button onClick={() => navigateDate('next')} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"><ChevronRight size={20} /></button>
           </div>
        </div>
      </header>

      {/* === LINHA 1: FINANCEIRO GERAL === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SmartCard title="Lucro Líquido (Real)" value={formatMoney(metrics.profit)} subtitle={metrics.profit >= 0 ? "O que sobrou no bolso" : "Prejuízo no período"} icon={Wallet} color={metrics.profit >= 0 ? "emerald" : "red"} highlight={true} />
        <SmartCard title="Faturamento Total" value={formatMoney(metrics.income)} subtitle="Soma de todos os apps" icon={TrendingUp} color="blue" />
        <SmartCard title="Despesas Totais" value={formatMoney(metrics.expense)} subtitle="Gastos registrados" icon={TrendingDown} color="red" />
      </div>

      {/* === LINHA 2: PRODUTIVIDADE & RENTABILIDADE (NOVO) === */}
      <div className="space-y-3">
        <h2 className="text-white font-bold text-sm flex items-center gap-2 uppercase tracking-wide opacity-80">
            <Target size={16} className="text-purple-500"/> Produtividade Bruta
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
           <SmartCard title="Ganho/Hora" value={formatMoney(metrics.grossPerHour)} subtitle="Faturamento Bruto" icon={Clock} color="indigo" />
           <SmartCard title="Ganho/KM" value={formatMoney(metrics.grossPerKm)} subtitle="Faturamento Bruto" icon={MapPin} color="violet" />
           <SmartCard title="Média Diária" value={formatMoney(metrics.avgDailyIncome)} subtitle="Dias trabalhados" icon={Calendar} color="pink" />
           
           <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-lg relative overflow-hidden group hover:border-gray-700 transition-all">
              <div className="absolute -right-6 -top-6 p-8 opacity-[0.03] bg-yellow-500 rounded-full blur-2xl"></div>
              <div className="flex justify-between items-start mb-3">
                 <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"><Trophy size={22} /></div>
              </div>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Melhor App</p>
              <h3 className="text-xl font-bold text-white mt-0.5 mb-0.5 capitalize truncate">{metrics.bestApp.name.toLowerCase().replace('_', ' ')}</h3>
              <p className="text-[10px] text-gray-500">{formatMoney(metrics.bestApp.amount)}</p>
           </div>
        </div>
      </div>

      {/* === LINHA 3: EFICIÊNCIA OPERACIONAL (CUSTOS) === */}
      <div className="space-y-3">
        <h2 className="text-white font-bold text-sm flex items-center gap-2 uppercase tracking-wide opacity-80">
            <Zap size={16} className="text-yellow-500"/> Eficiência Real (Líquida)
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SmartCard title="Lucro Real/Hora" value={formatMoney(metrics.profitPerHour)} subtitle="Líquido descontando custos" icon={Clock} color="emerald" />
          <SmartCard title="Lucro Real/KM" value={formatMoney(metrics.profitPerKm)} subtitle="O que sobra por km" icon={MapPin} color="teal" />
          <SmartCard 
            title="Custo/KM" 
            value={formatMoney(metrics.costPerKm)} 
            subtitle={timeFilter === 'DAY' && metrics.clusterAvg > 0 ? `Ref. Painel: ${metrics.clusterAvg}km/l` : 'Ref. Despesas Reais'} 
            icon={AlertCircle} 
            color="orange" 
          />
          <SmartCard title="Rodagem Total" value={`${metrics.km} km`} subtitle={`${metrics.hours.toFixed(1)}h online`} icon={Car} color="blue" />
        </div>
      </div>

      {/* === COMPARAÇÃO DE MÉDIAS === */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex items-center justify-between">
            <div>
               <p className="text-gray-500 text-[10px] font-bold uppercase">Média Painel (Informada)</p>
               <h4 className="text-xl font-bold text-orange-400 mt-1">
                  {metrics.clusterAvg > 0 ? metrics.clusterAvg.toFixed(1) : '--'} <span className="text-xs text-gray-600">km/l</span>
               </h4>
            </div>
            <Gauge className="text-orange-500/20" size={32} />
         </div>
         <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex items-center justify-between">
            <div>
               <p className="text-gray-500 text-[10px] font-bold uppercase">Média Real (Bomba)</p>
               <h4 className="text-xl font-bold text-blue-400 mt-1">
                  {metrics.realAvg > 0 ? metrics.realAvg.toFixed(1) : '--'} <span className="text-xs text-gray-600">km/l</span>
               </h4>
            </div>
            <Fuel className="text-blue-500/20" size={32} />
         </div>
      </div>

      {/* === GRÁFICO DE BARRAS (DIÁRIO) === */}
      <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 h-96 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">Desempenho Diário</h3>
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

      {/* === NOVO: GRÁFICO DE ODÔMETRO (AQUI ESTÁ!) === */}
      <div className="pt-4">
         <OdometerChart transactions={transactions} />
      </div>

    </div>
  );
}