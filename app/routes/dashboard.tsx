import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, MapPin, AlertCircle, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { db, auth } from "~/lib/firebase.client";
import type { Transaction } from "~/types/models";

// === TOOLTIP CUSTOMIZADO (Manteve-se igual) ===
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

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // === NOVO ESTADO: DATA DE REFERÊNCIA ===
  // Começa sempre no dia 1 do mês atual
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Métricas
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalKm, setTotalKm] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);

  // === FUNÇÕES DE NAVEGAÇÃO DE MÊS ===
  const prevMonth = () => {
    setCurrentDate(old => new Date(old.getFullYear(), old.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(old => new Date(old.getFullYear(), old.getMonth() + 1, 1));
  };

  // Buscar dados quando a Data ou Usuário mudar
  useEffect(() => {
    if (!auth.currentUser) return;
    setLoading(true);

    // 1. Definir Início e Fim do Mês Selecionado
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    
    // Para pegar o fim do mês, pegamos o dia 1 do próximo e subtraímos 1ms ou usamos lógica de data
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1).toISOString();
    
    // Consulta: Pega tudo MAIOR que dia 1 do mês E MENOR que dia 1 do próximo mês
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", auth.currentUser.uid),
      where("date", ">=", startOfMonth),
      where("date", "<", endOfMonth), // Filtro de teto
      orderBy("date", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
      setTransactions(data);
      calculateMetrics(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentDate]); // Recarrega sempre que mudar o mês

  const calculateMetrics = (data: Transaction[]) => {
    let income = 0;
    let expense = 0;
    let km = 0;
    const dailyMap = new Map();

    data.forEach(t => {
      const val = t.amount / 100;
      if (t.type === 'INCOME') {
        income += val;
        if ('distanceDriven' in t) km += Number(t.distanceDriven);
      } else {
        expense += val;
      }

      const day = new Date(t.date).getDate();
      if (!dailyMap.has(day)) dailyMap.set(day, { day, income: 0, expense: 0 });
      const dayData = dailyMap.get(day);
      if (t.type === 'INCOME') dayData.income += val;
      else dayData.expense += val;
    });

    setTotalIncome(income);
    setTotalExpense(expense);
    setTotalKm(km);

    const chartArray = Array.from(dailyMap.values()).sort((a, b) => a.day - b.day);
    setChartData(chartArray);
  };

  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  
  // Formatador do Título do Mês (Ex: Janeiro de 2026)
  const formatMonthTitle = (date: Date) => {
    return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const costPerKm = totalKm > 0 ? (totalExpense / totalKm) : 0;
  const profit = totalIncome - totalExpense;

  return (
    <div className="space-y-8 pb-10">
      
      {/* === CABEÇALHO COM NAVEGAÇÃO === */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Visão Geral</h1>
          <p className="text-gray-400 mt-1 text-sm">Acompanhe sua evolução financeira</p>
        </div>

        {/* Componente de Navegação de Mês */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-1 flex items-center shadow-lg">
          <button 
            onClick={prevMonth}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex items-center gap-2 px-4 min-w-[180px] justify-center text-emerald-400 font-bold capitalize select-none">
            <Calendar size={18} />
            {formatMonthTitle(currentDate)}
          </div>

          <button 
            onClick={nextMonth}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      {/* === KPI CARDS === */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Lucro */}
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 relative overflow-hidden">
          <div className={`absolute top-0 right-0 p-4 opacity-10 ${profit >= 0 ? 'bg-emerald-500' : 'bg-red-500'} rounded-bl-3xl`}>
             <Wallet size={32} className="text-white"/>
          </div>
          <span className="text-gray-400 text-sm font-medium">Lucro Líquido</span>
          <div className={`text-3xl font-bold mt-2 ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatMoney(profit)}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {totalIncome > 0 ? ((profit / totalIncome) * 100).toFixed(1) : 0}% de margem
          </p>
        </div>

        {/* Faturamento */}
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-gray-400 text-sm font-medium">Faturamento</span>
              <div className="text-2xl font-bold text-white mt-1">
                {formatMoney(totalIncome)}
              </div>
            </div>
            <div className="bg-emerald-500/10 p-2 rounded-lg">
              <TrendingUp size={20} className="text-emerald-500"/>
            </div>
          </div>
        </div>

        {/* Despesas */}
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-gray-400 text-sm font-medium">Despesas Totais</span>
              <div className="text-2xl font-bold text-white mt-1">
                {formatMoney(totalExpense)}
              </div>
            </div>
            <div className="bg-red-500/10 p-2 rounded-lg">
              <TrendingDown size={20} className="text-red-500"/>
            </div>
          </div>
        </div>

        {/* Custo por KM */}
        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 ring-1 ring-blue-500/20">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-blue-400 text-sm font-bold">Custo por KM</span>
              <div className="text-2xl font-bold text-white mt-1">
                {formatMoney(costPerKm)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Baseado em {totalKm} km rodados</p>
            </div>
            <div className="bg-blue-500/10 p-2 rounded-lg">
              <MapPin size={20} className="text-blue-500"/>
            </div>
          </div>
        </div>
      </div>

      {/* === GRÁFICO === */}
      <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 h-96">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">Desempenho Diário</h3>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded border border-gray-700">
            {transactions.length} registros
          </span>
        </div>
        
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-600 animate-pulse">Carregando dados...</div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 border border-dashed border-gray-800 rounded-xl bg-gray-900/50">
            <AlertCircle className="mb-2 h-8 w-8 opacity-50"/>
            <p className="text-sm">Nenhum registro encontrado em</p>
            <p className="font-bold text-gray-500 capitalize">{formatMonthTitle(currentDate)}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              margin={{ top: 10, right: 10, left: 0, bottom: 30 }} 
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              
              <XAxis 
                dataKey="day" 
                stroke="#6b7280" 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val) => `Dia ${val}`}
                dy={10} 
              />
              
              <YAxis 
                stroke="#6b7280" 
                tickLine={false} 
                axisLine={false} 
                width={80} 
                tickFormatter={(val) => `R$${val}`}
              />

              <Tooltip 
                cursor={{fill: '#374151', opacity: 0.2}}
                content={<CustomTooltip />}
              />

              <Bar dataKey="income" name="Ganhos" radius={[4, 4, 0, 0]} maxBarSize={50}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-inc-${index}`} fill="#10b981" />
                ))}
              </Bar>
              <Bar dataKey="expense" name="Despesas" radius={[4, 4, 0, 0]} maxBarSize={50}>
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