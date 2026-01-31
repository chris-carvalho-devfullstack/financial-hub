// app/routes/admin.financials.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { DollarSign, TrendingUp, CreditCard, Wallet } from "lucide-react";

const data = [
  { name: 'Jan', receita: 4000, despesa: 2400 },
  { name: 'Fev', receita: 3000, despesa: 1398 },
  { name: 'Mar', receita: 2000, despesa: 9800 }, // Exemplo de prejuízo
  { name: 'Abr', receita: 2780, despesa: 3908 },
  { name: 'Mai', receita: 1890, despesa: 4800 },
  { name: 'Jun', receita: 2390, despesa: 3800 },
];

export default function AdminFinancials() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Financeiro Global da Plataforma</h2>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Receita Total (YTD)</p>
              <h3 className="text-2xl font-bold text-gray-900">R$ 142.3k</h3>
            </div>
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <DollarSign size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Lucro Líquido</p>
              <h3 className="text-2xl font-bold text-emerald-600">R$ 42.1k</h3>
            </div>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Wallet size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Ticket Médio</p>
              <h3 className="text-2xl font-bold text-gray-900">R$ 24,50</h3>
            </div>
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Custos Operacionais</p>
              <h3 className="text-2xl font-bold text-red-600">R$ 98.2k</h3>
            </div>
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <CreditCard size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico Principal */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-96">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Fluxo de Caixa (Semestral)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="receita" name="Receita" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="despesa" name="Despesa" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}