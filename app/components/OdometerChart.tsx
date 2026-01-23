// app/components/OdometerChart.tsx

import { useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { TrendingUp } from 'lucide-react'; // Ícone para o estado vazio
import type { Transaction } from '~/types/models';

interface OdometerChartProps {
  transactions: Transaction[];
}

export function OdometerChart({ transactions }: OdometerChartProps) {
  
  // Processamento dos dados
  const data = useMemo(() => {
    return transactions
      .filter(t => t.odometer && t.odometer > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(t => ({
        date: new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        fullDate: new Date(t.date).toLocaleDateString('pt-BR'),
        km: t.odometer,
        desc: t.description || (t.type === 'INCOME' ? 'Ganho' : (t as any).category || 'Registro')
      }));
  }, [transactions]);

  // Cálculos para o Header (mesmo sem dados suficientes para plotar, tentamos mostrar algo)
  const hasData = data.length >= 2;
  const firstPoint = hasData ? data[0] : null;
  const lastPoint = hasData ? data[data.length - 1] : null;
  const totalKm = (firstPoint && lastPoint) ? (lastPoint.km || 0) - (firstPoint.km || 0) : 0;
  
  let avgKmPerDay = 0;
  if (hasData && firstPoint && lastPoint) {
      const firstDate = transactions.find(t => t.odometer === firstPoint.km)?.date;
      const lastDate = transactions.find(t => t.odometer === lastPoint.km)?.date;
      
      if (firstDate && lastDate) {
        const diffTime = Math.abs(new Date(lastDate).getTime() - new Date(firstDate).getTime());
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        avgKmPerDay = Math.round(totalKm / diffDays);
      }
  }

  return (
    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl h-96 flex flex-col">
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
             📈 Evolução da Rodagem
          </h2>
          <p className="text-gray-400 text-sm">Crescimento do odômetro no período</p>
        </div>
        
        {hasData && totalKm > 0 && (
          <div className="text-right">
             <div className="text-xl md:text-2xl font-mono font-bold text-emerald-400">
               {avgKmPerDay} km<span className="text-sm text-gray-500 font-sans font-normal">/dia</span>
             </div>
             <div className="text-xs text-gray-500">Média no período</div>
          </div>
        )}
      </div>

      <div className="flex-1 w-full min-h-0">
        {!hasData ? (
           // ESTADO VAZIO (Para quando não tiver dados suficientes)
           <div className="h-full flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-800 rounded-xl bg-gray-900/50">
              <div className="bg-gray-800 p-3 rounded-full mb-3 opacity-50">
                 <TrendingUp size={24} />
              </div>
              <p className="font-bold">Dados Insuficientes</p>
              <p className="text-xs max-w-[200px] text-center mt-1">
                 Registre pelo menos 2 movimentações com odômetro neste período para gerar a curva.
              </p>
           </div>
        ) : (
           // GRÁFICO (Quando tiver dados)
           <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorKm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF" 
                tick={{ fontSize: 12 }} 
                tickMargin={10} 
              />
              
              <YAxis 
                dataKey="km" 
                domain={['auto', 'auto']}
                stroke="#9CA3AF" 
                tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
                width={35}
              />
              
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#111827', 
                  borderColor: '#374151', 
                  color: '#fff',
                  borderRadius: '0.75rem' 
                }}
                itemStyle={{ color: '#10B981' }}
                cursor={{ stroke: '#4B5563', strokeWidth: 1, strokeDasharray: '4 4' }}
                labelStyle={{ color: '#9CA3AF', marginBottom: '0.25rem', fontSize: '0.8rem' }}
                formatter={(value: any) => [
                  `${Number(value).toLocaleString('pt-BR')} km`, 
                  'Odômetro'
                ]}
                labelFormatter={(label, payload) => {
                  if (payload && payload.length > 0) {
                      return `${payload[0].payload.fullDate} • ${payload[0].payload.desc}`;
                  }
                  return label;
                }}
              />
              
              <Area 
                type="monotone" 
                dataKey="km" 
                stroke="#10B981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorKm)" 
                activeDot={{ r: 6, strokeWidth: 0, fill: '#10B981' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}