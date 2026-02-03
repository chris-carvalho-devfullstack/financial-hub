// app/routes/admin.financials.tsx
import { useEffect, useState, useMemo } from "react";
import { supabase } from "~/lib/supabase.client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DollarSign, TrendingUp, CreditCard, Wallet, Loader2 } from "lucide-react";

// Tipagem baseada no retorno do banco
interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  date: string;
  category: string;
}

export default function AdminFinancials() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Busca os dados usando a RPC segura de Admin
  useEffect(() => {
    async function fetchGlobalData() {
      try {
        const { data, error } = await supabase.rpc('get_all_transactions_admin');
        
        if (error) throw error;
        if (data) setTransactions(data);
      } catch (err) {
        console.error("Erro ao carregar financeiro global:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchGlobalData();
  }, []);

  // Cálculos de Totais (Memoized para performance)
  const metrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    let count = 0;

    transactions.forEach((t) => {
      const val = Number(t.amount);
      if (t.type === 'INCOME') {
        income += val;
      } else {
        expense += val;
      }
      count++;
    });

    return {
      income,
      expense,
      profit: income - expense,
      ticket: count > 0 ? (income / count) : 0 // Ticket médio simples
    };
  }, [transactions]);

  // Transformação de dados para o Gráfico (Agrupado por Mês)
  const chartData = useMemo(() => {
    const map = new Map<string, { name: string; receita: number; despesa: number; sortDate: number }>();

    transactions.forEach((t) => {
      const dateObj = new Date(t.date);
      // Chave única ex: "2023-10" para ordenar corretamente
      const key = `${dateObj.getFullYear()}-${dateObj.getMonth()}`; 
      // Nome visual ex: "Out"
      const name = dateObj.toLocaleString('pt-BR', { month: 'short' });
      
      if (!map.has(key)) {
        map.set(key, { name, receita: 0, despesa: 0, sortDate: dateObj.getTime() });
      }

      const entry = map.get(key)!;
      if (t.type === 'INCOME') entry.receita += Number(t.amount);
      else entry.despesa += Number(t.amount);
    });

    // Converte Map para Array e ordena por data
    return Array.from(map.values())
      .sort((a, b) => a.sortDate - b.sortDate)
      .slice(-6); // Pega apenas os últimos 6 meses com movimento
  }, [transactions]);

  // Formatador de Moeda (Atualizado para evitar erro de tipagem)
  const formatCurrency = (val: number | string | undefined) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Financeiro Global da Plataforma</h2>
        <span className="text-xs md:text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
          Modo Admin: Visualizando dados de todos os usuários
        </span>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card Receita */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Receita Total</p>
              <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.income)}</h3>
            </div>
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <DollarSign size={20} />
            </div>
          </div>
        </div>

        {/* Card Lucro */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Lucro Líquido</p>
              <h3 className={`text-2xl font-bold ${metrics.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(metrics.profit)}
              </h3>
            </div>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Wallet size={20} />
            </div>
          </div>
        </div>

        {/* Card Ticket Médio */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Média p/ Transação</p>
              <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.ticket)}</h3>
            </div>
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>

        {/* Card Despesas */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Custos Operacionais</p>
              <h3 className="text-2xl font-bold text-red-600">{formatCurrency(metrics.expense)}</h3>
            </div>
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <CreditCard size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico Principal */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-96">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Fluxo de Caixa (Últimos 6 meses ativos)</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{fill: '#6B7280'}} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                tickFormatter={(val) => `R$${val/1000}k`} 
                tick={{fill: '#6B7280'}} 
                axisLine={false} 
                tickLine={false} 
              />
              <Tooltip 
                // CORREÇÃO AQUI: Usamos 'any' no argumento para silenciar o erro de tipagem estrita do Recharts
                formatter={(value: any) => [formatCurrency(value), undefined]}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="receita" name="Receita" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={50} />
              <Bar dataKey="despesa" name="Despesa" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            Nenhuma transação registrada ainda.
          </div>
        )}
      </div>
    </div>
  );
}