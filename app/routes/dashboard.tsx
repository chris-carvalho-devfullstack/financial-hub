import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { 
  TrendingUp, TrendingDown, Wallet, MapPin, AlertCircle, ChevronLeft, ChevronRight, 
  Calendar, Clock, Zap, AlertTriangle, Car
} from "lucide-react";
import { db, auth } from "~/lib/firebase.client";
import type { Transaction, IncomeTransaction } from "~/types/models";

// === COMPONENTE TOOLTIP DO GRÁFICO ===
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

// === COMPONENTE SMART CARD ===
function SmartCard({ title, value, subtitle, icon: Icon, color, trend }: any) {
  return (
    <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-lg relative overflow-hidden group hover:border-gray-700 transition-all">
      <div className={`absolute -right-6 -top-6 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity bg-${color}-500 rounded-full blur-2xl`}></div>
      
      <div className="flex justify-between items-start mb-4">
         <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-500 border border-${color}-500/20`}>
            <Icon size={24} />
         </div>
      </div>

      <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-bold text-white mt-1 mb-1">{value}</h3>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}

// === PÁGINA DASHBOARD ===
export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Data de referência (Sempre dia 1 do mês)
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Métricas
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalKm, setTotalKm] = useState(0);
  const [totalHours, setTotalHours] = useState(0); // Nova métrica
  const [chartData, setChartData] = useState<any[]>([]);

  // Navegação
  const prevMonth = () => setCurrentDate(old => new Date(old.getFullYear(), old.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(old => new Date(old.getFullYear(), old.getMonth() + 1, 1));

  useEffect(() => {
    if (!auth.currentUser) return;
    setLoading(true);

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1).toISOString();
    
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", auth.currentUser.uid),
      where("date", ">=", startOfMonth),
      where("date", "<", endOfMonth),
      orderBy("date", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
      setTransactions(data);
      calculateMetrics(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentDate]);

  const calculateMetrics = (data: Transaction[]) => {
    let income = 0;
    let expense = 0;
    let km = 0;
    let minutes = 0;
    const dailyMap = new Map();

    data.forEach(t => {
      const val = t.amount / 100;
      if (t.type === 'INCOME') {
        income += val;
        // Tipagem segura para acessar propriedades específicas de IncomeTransaction
        const inc = t as IncomeTransaction;
        if (inc.distanceDriven) km += Number(inc.distanceDriven);
        if (inc.onlineDurationMinutes) minutes += Number(inc.onlineDurationMinutes);
      } else {
        expense += val;
      }

      // Dados para o Gráfico
      const day = new Date(t.date).getDate();
      if (!dailyMap.has(day)) dailyMap.set(day, { day, income: 0, expense: 0 });
      const dayData = dailyMap.get(day);
      if (t.type === 'INCOME') dayData.income += val;
      else dayData.expense += val;
    });

    setTotalIncome(income);
    setTotalExpense(expense);
    setTotalKm(km);
    setTotalHours(minutes / 60);

    const chartArray = Array.from(dailyMap.values()).sort((a, b) => a.day - b.day);
    setChartData(chartArray);
  };

  // Formatadores
  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatMonthTitle = (date: Date) => date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  // Cálculos de Inteligência
  const profit = totalIncome - totalExpense;
  const costPerKm = totalKm > 0 ? (totalExpense / totalKm) : 0;
  const profitPerKm = totalKm > 0 ? (profit / totalKm) : 0;
  const profitPerHour = totalHours > 0 ? (profit / totalHours) : 0;

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      
      {/* === CABEÇALHO === */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            Visão Geral
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Performance financeira e operacional.</p>
        </div>

        {/* Navegador de Mês */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-1 flex items-center shadow-lg self-start md:self-auto">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2 px-4 min-w-[160px] justify-center text-emerald-400 font-bold capitalize select-none">
            <Calendar size={18} />
            {formatMonthTitle(currentDate)}
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      {/* === LINHA 1: FINANCEIRO === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SmartCard 
           title="Lucro Líquido"
           value={formatMoney(profit)}
           subtitle={`${profit >= 0 ? 'Lucro' : 'Prejuízo'} real após custos.`}
           icon={Wallet}
           color={profit >= 0 ? "emerald" : "red"}
        />
        <SmartCard 
           title="Faturamento"
           value={formatMoney(totalIncome)}
           subtitle="Total bruto arrecadado."
           icon={TrendingUp}
           color="blue"
        />
        <SmartCard 
           title="Despesas"
           value={formatMoney(totalExpense)}
           subtitle="Combustível e Manutenção."
           icon={TrendingDown}
           color="red"
        />
      </div>

      {/* === LINHA 2: INTELIGÊNCIA (HORA/KM) === */}
      <div className="space-y-4">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Zap size={18} className="text-yellow-500"/> Eficiência Operacional
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Lucro/Hora */}
          <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 relative group hover:border-yellow-500/30 transition-colors">
             <div className="flex justify-between items-start mb-2">
                <span className="text-gray-400 text-xs font-bold uppercase">Lucro / Hora</span>
                <Clock size={16} className="text-yellow-500"/>
             </div>
             <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">{formatMoney(profitPerHour)}</span>
                <span className="text-xs text-gray-500">/h</span>
             </div>
             <p className="text-[10px] text-gray-500 mt-2">Baseado em {totalHours.toFixed(1)}h trabalhadas</p>
          </div>

          {/* Lucro/KM */}
          <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 relative group hover:border-emerald-500/30 transition-colors">
             <div className="flex justify-between items-start mb-2">
                <span className="text-gray-400 text-xs font-bold uppercase">Lucro / KM</span>
                <MapPin size={16} className="text-emerald-500"/>
             </div>
             <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">{formatMoney(profitPerKm)}</span>
                <span className="text-xs text-gray-500">/km</span>
             </div>
             <p className="text-[10px] text-gray-500 mt-2">Lucro limpo por km rodado</p>
          </div>

          {/* Custo/KM */}
          <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 relative group hover:border-red-500/30 transition-colors">
             <div className="flex justify-between items-start mb-2">
                <span className="text-gray-400 text-xs font-bold uppercase">Custo / KM</span>
                <AlertCircle size={16} className="text-red-500"/>
             </div>
             <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">{formatMoney(costPerKm)}</span>
                <span className="text-xs text-gray-500">/km</span>
             </div>
             <p className="text-[10px] text-gray-500 mt-2">Custo de operação do carro</p>
          </div>

           {/* Rodagem Total */}
           <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 relative group hover:border-blue-500/30 transition-colors">
             <div className="flex justify-between items-start mb-2">
                <span className="text-gray-400 text-xs font-bold uppercase">Rodagem</span>
                <Car size={16} className="text-blue-500"/>
             </div>
             <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">{totalKm}</span>
                <span className="text-xs text-gray-500">km</span>
             </div>
             <p className="text-[10px] text-gray-500 mt-2">Distância percorrida no mês</p>
          </div>
        </div>

        {/* ALERTA INTELIGENTE */}
        {profitPerHour > 0 && profitPerHour < 15 && (
             <div className="p-4 bg-yellow-900/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
                <AlertTriangle className="text-yellow-500 shrink-0" size={20} />
                <div>
                   <h4 className="text-yellow-500 font-bold text-sm">Alerta de Baixo Rendimento</h4>
                   <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                      Seu lucro real está em <strong>{formatMoney(profitPerHour)}/hora</strong>. Isso é abaixo da média recomendada de R$ 15,00/h. Considere rodar em horários de maior dinâmica ou reduzir custos de combustível.
                   </p>
                </div>
             </div>
        )}
      </div>

      {/* === GRÁFICO === */}
      <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 h-96 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">Desempenho Diário</h3>
          <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
            {transactions.length} registros
          </span>
        </div>
        
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-600 animate-pulse">Carregando dados...</div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 border border-dashed border-gray-800 rounded-xl bg-gray-900/50">
            <AlertCircle className="mb-2 h-8 w-8 opacity-50"/>
            <p className="text-sm">Nenhum registro em</p>
            <p className="font-bold text-gray-500 capitalize">{formatMonthTitle(currentDate)}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis 
                dataKey="day" 
                stroke="#6b7280" 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val) => `${val}`}
                dy={10}
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280" 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => `R$${val}`}
                fontSize={12}
              />
              <Tooltip cursor={{fill: '#374151', opacity: 0.2}} content={<CustomTooltip />} />
              <Bar dataKey="income" name="Ganhos" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-inc-${index}`} fill="#10b981" />
                ))}
              </Bar>
              <Bar dataKey="expense" name="Despesas" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-exp-${index}`} fill="#ef4444" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}