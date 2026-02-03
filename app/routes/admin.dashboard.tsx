// app/routes/admin.dashboard.tsx

import { useEffect, useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, CartesianGrid 
} from 'recharts';
import { Users, UserMinus, DollarSign, TrendingUp, AlertCircle, Database } from "lucide-react";
import { supabase } from "~/lib/supabase.client";
import type { UserProfile } from "~/types/models";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activePros: 0,
    newProsMonth: 0,
    churnCount: 0,
    churnRate: 0,
    mrr: 0,
    totalUsers: 0
  });
  
  const [churnChartData, setChurnChartData] = useState<any[]>([]);
  const [planDistributionData, setPlanDistributionData] = useState<any[]>([]);

  const TICKET_MEDIO_PRO = 19.90; 

  useEffect(() => {
    const fetchData = async () => {
      try {
        // BUSCA SEGURA DE ADMIN (Usa RPC para furar RLS)
        const { data: usersData, error } = await supabase.rpc('get_all_profiles_admin');
        
        if (error) throw error;
        
        // Se a RPC retornar null/undefined por algum motivo
        if (!usersData) {
            setLoading(false);
            return;
        }

        // Mapeamento snake_case -> camelCase local para manter lógica
        const users = usersData.map((u: any) => ({
            uid: u.id,
            plan: u.plan,
            subscriptionStatus: u.subscription_status,
            createdAt: u.created_at,
            canceledAt: u.canceled_at
        }));

        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let activePros = 0;
        let totalFree = 0;
        let newProsMonth = 0;
        let churnCountRecent = 0;
        
        const churnMap = new Map<string, number>();

        users.forEach((user: any) => {
          if (user.plan === 'PRO' && user.subscriptionStatus === 'ACTIVE') {
            activePros++;
            if (user.createdAt && new Date(user.createdAt) >= firstDayOfMonth) {
              newProsMonth++;
            }
          } else {
            totalFree++;
          }

          if (user.canceledAt) {
            const cancelDate = new Date(user.canceledAt);
            if (cancelDate >= thirtyDaysAgo) {
              churnCountRecent++;
            }
            const monthKey = cancelDate.toLocaleDateString('pt-BR', { month: 'short' });
            churnMap.set(monthKey, (churnMap.get(monthKey) || 0) + 1);
          }
        });

        const totalBase = activePros + churnCountRecent;
        const churnRate = totalBase > 0 ? ((churnCountRecent / totalBase) * 100) : 0;

        const chartData = Array.from(churnMap.entries()).map(([name, cancelamentos]) => ({
          name, cancelamentos
        }));

        const pieData = [
          { name: 'Free', value: totalFree },
          { name: 'Pro', value: activePros },
        ];

        setStats({
          activePros,
          newProsMonth,
          churnCount: churnCountRecent,
          churnRate,
          mrr: activePros * TICKET_MEDIO_PRO,
          totalUsers: users.length
        });

        setChurnChartData(chartData);
        setPlanDistributionData(pieData);

      } catch (error) {
        console.error("Erro ao calcular dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const COLORS = ['#94a3b8', '#8b5cf6']; 

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Carregando métricas do SaaS...</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Painel de Controle SaaS</h2>
        <span className="text-sm text-gray-400">Atualizado agora</span>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* 1. Total de Usuários */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total de Usuários</p>
            <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.totalUsers}</h3>
            <p className="text-xs text-gray-400 mt-1">
              Base completa cadastrada
            </p>
          </div>
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg h-fit"><Database size={24} /></div>
        </div>

        {/* 2. Assinantes PRO */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Assinantes PRO (Ativos)</p>
            <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.activePros}</h3>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
               <TrendingUp size={12}/> +{stats.newProsMonth} novos este mês
            </span>
          </div>
          <div className="p-3 bg-purple-100 text-purple-600 rounded-lg h-fit"><Users size={24} /></div>
        </div>

        {/* 3. Churn Rate */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Churn Rate (30 dias)</p>
            <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.churnRate.toFixed(1)}%</h3>
            <p className="text-xs text-gray-400 mt-1">
              {stats.churnCount} cancelamentos recentes
            </p>
          </div>
          <div className="p-3 bg-red-100 text-red-600 rounded-lg h-fit"><UserMinus size={24} /></div>
        </div>

        {/* 4. MRR Estimado */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">MRR Estimado</p>
            <h3 className="text-3xl font-bold text-gray-900 mt-1">{formatMoney(stats.mrr)}</h3>
            <p className="text-xs text-gray-400 mt-1">Base: R$ {TICKET_MEDIO_PRO.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg h-fit"><DollarSign size={24} /></div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico de Evolução do Churn */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <UserMinus size={18} className="text-red-500"/> Histórico de Cancelamentos
          </h3>
          
          <div className="h-72 w-full"> 
            {churnChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={churnChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip cursor={{fill: '#f3f4f6'}} />
                    <Bar dataKey="cancelamentos" fill="#EF4444" radius={[4, 4, 0, 0]} name="Cancelamentos" barSize={40} />
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-lg">
                    <AlertCircle size={32} className="mb-2 opacity-50"/>
                    Sem cancelamentos registrados ainda.
                </div>
            )}
          </div>
        </div>

        {/* Gráfico de Distribuição */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribuição da Base</h3>
          
          <div className="h-72 w-full"> 
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                <Pie 
                    data={planDistributionData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={60}
                    outerRadius={80} 
                    paddingAngle={5}
                    label
                >
                    {planDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
                </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex justify-center gap-6 mt-4">
             <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-3 h-3 rounded-full bg-slate-400"></div> Free
             </div>
             <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-3 h-3 rounded-full bg-violet-500"></div> PRO
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}