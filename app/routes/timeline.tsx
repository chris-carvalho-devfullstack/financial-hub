// app/routes/timeline.tsx

import { useEffect, useState, useMemo, useCallback } from "react";
import React from "react";
import { 
  Calendar, Wrench, Fuel, TrendingUp, Filter, 
  Car, MapPin, ArrowDownCircle, Route, Flag,
  Gauge, Droplets, DollarSign, Timer, Navigation,
  Target, Trophy, CheckCircle2, CalendarDays, Clock
} from "lucide-react";
import { supabase } from "~/lib/supabase.client";
import type { Vehicle, Transaction, ExpenseTransaction, FuelTransaction, IncomeTransaction } from "~/types/models";
import { ExpenseCategory } from "~/types/enums";
import type { User } from "@supabase/supabase-js";

// === TYPES LOCAIS ===
type TimelineEventType = 'TRANSACTION' | 'GOAL_CREATED' | 'GOAL_REACHED';

interface TimelineItem {
  id: string;
  date: string;
  type: TimelineEventType;
  data: any;
  sortDate: number;
}

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  created_at: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  achieved_at?: string;
  user_id: string;
}

// === UTILITÁRIOS ===
const formatMoney = (val: number) => 
  (val / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatNumber = (val: number) => 
  val.toLocaleString('pt-BR');

const formatDate = (dateString: string) => {
  if (!dateString) return '--/--';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const formatTimeDuration = (minutes: number) => {
  if (!minutes) return "0min";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}min`;
};

const getMonthYear = (dateString: string) => {
  const date = new Date(dateString);
  const str = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const getAppLogo = (text?: string | null) => {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes('uber')) return '/logos/uber.png';
  if (lower.includes('99')) return '/logos/99.png';
  if (lower.includes('indriver') || lower.includes('in-driver')) return '/logos/indriver.png';
  if (lower.includes('ifood')) return '/logos/ifood.png';
  if (lower.includes('zé') || lower.includes('ze delivery')) return '/logos/ze-delivery.png';
  return null; 
};

// === SKELETON ===
function TimelineSkeleton() {
  return (
    <div className="space-y-8 animate-pulse mt-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="relative md:pl-24 flex gap-4">
          <div className="hidden md:block absolute left-9 top-0 w-10 h-10 -ml-3.5 rounded-full bg-gray-800 border-4 border-gray-900 z-10" />
          <div className="md:hidden flex flex-col items-center min-w-[3.5rem] gap-2 pt-1">
            <div className="h-4 w-6 bg-gray-800 rounded" />
            <div className="h-full w-0.5 bg-gray-800 rounded-full" />
          </div>
          <div className="flex-1 p-5 rounded-xl border border-gray-800 bg-gray-900/40">
            <div className="h-4 w-32 bg-gray-800 rounded mb-4" />
            <div className="h-16 w-full bg-gray-800/30 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// === PÁGINA PRINCIPAL ===
export default function TimelinePage() {
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'FUEL' | 'MAINTENANCE'>('ALL');

  // 0. Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 1. Veículos
  const fetchVehicles = useCallback(async () => {
    if (!user) return;
    const { data: vData } = await supabase.from('vehicles').select('*').eq('user_id', user.id);

    if (vData) {
      const mappedVehicles = vData.map((v: any) => ({
        ...v,
        userId: v.user_id,
        currentOdometer: v.current_odometer,
        fuelTypes: v.tanks ? v.tanks.flatMap((t: any) => t.fuelTypes) : []
      }));
      setVehicles(mappedVehicles as any);

      if (mappedVehicles.length > 0 && !selectedVehicleId) {
        const { data: pData } = await supabase.from('profiles').select('last_selected_vehicle_id').eq('id', user.id).single();
        if (pData?.last_selected_vehicle_id) setSelectedVehicleId(pData.last_selected_vehicle_id);
        else setSelectedVehicleId(mappedVehicles[0].id);
      }
    }
  }, [user, selectedVehicleId]);

  useEffect(() => {
    if (user) {
      fetchVehicles();
      const channel = supabase.channel('realtime-vehicles-timeline')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => fetchVehicles())
        .subscribe();
      return () => { supabase.removeChannel(channel); }
    }
  }, [user, fetchVehicles]);

  // 2. Dados
  const fetchData = useCallback(async () => {
    if (!selectedVehicleId || !user) return;
    setLoading(true);

    try {
      // Transações
      const { data: transData } = await supabase
        .from('transactions')
        .select('*')
        .eq('vehicle_id', selectedVehicleId)
        .order('date', { ascending: false });

      // Metas
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id);

      let items: TimelineItem[] = [];

      if (transData) {
        const mappedTrans = transData.map(t => ({
          ...t,
          userId: t.user_id,
          vehicleId: t.vehicle_id,
          fuelType: t.fuel_type,
          stationName: t.station_name,
          pricePerLiter: t.price_per_liter,
          fullTank: t.is_full_tank,
          distanceDriven: t.distance_driven,
          isFixedCost: t.is_fixed_cost
        }));

        const tItems: TimelineItem[] = mappedTrans.map((t: any) => ({
          id: t.id,
          date: t.date,
          type: 'TRANSACTION',
          data: t,
          sortDate: new Date(t.date).getTime()
        }));
        items = [...items, ...tItems];
      }

      if (goalsData) {
        goalsData.forEach((g: Goal) => {
          items.push({
            id: `goal-created-${g.id}`,
            date: g.created_at,
            type: 'GOAL_CREATED',
            data: g,
            sortDate: new Date(g.created_at).getTime()
          });

          if (g.status === 'COMPLETED' || (g.achieved_at)) {
             const dateAchieved = g.achieved_at || g.deadline || new Date().toISOString(); 
             items.push({
               id: `goal-reached-${g.id}`,
               date: dateAchieved,
               type: 'GOAL_REACHED',
               data: g,
               sortDate: new Date(dateAchieved).getTime()
             });
          }
        });
      }

      items.sort((a, b) => b.sortDate - a.sortDate);
      setTimelineItems(items);

    } catch (err) {
      console.error("Erro timeline:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedVehicleId, user]);

  useEffect(() => {
    if (selectedVehicleId) {
      fetchData();
      const channel = supabase.channel(`realtime-timeline-full`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, () => fetchData())
        .subscribe();
      return () => { supabase.removeChannel(channel); }
    }
  }, [selectedVehicleId, fetchData]);

  const handleVehicleChange = async (id: string) => {
    setSelectedVehicleId(id);
    if (user) await supabase.from('profiles').update({ last_selected_vehicle_id: id }).eq('id', user.id);
  };

  // 3. Agrupamento
  const groupedItems = useMemo(() => {
    const filtered = timelineItems.filter(item => {
      if (item.type !== 'TRANSACTION') return true; 
      
      const t = item.data as Transaction;
      if (filterType === 'ALL') return true;
      if (filterType === 'INCOME') return t.type === 'INCOME';
      if (filterType === 'EXPENSE') return t.type === 'EXPENSE' && (t as ExpenseTransaction).category !== ExpenseCategory.FUEL;
      if (filterType === 'FUEL') return t.type === 'EXPENSE' && (t as ExpenseTransaction).category === ExpenseCategory.FUEL;
      if (filterType === 'MAINTENANCE') return t.type === 'EXPENSE' && (t as ExpenseTransaction).category === ExpenseCategory.MAINTENANCE;
      return true;
    });

    return filtered.reduce((groups, item) => {
      const key = getMonthYear(item.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {} as Record<string, TimelineItem[]>);
  }, [timelineItems, filterType]);

  // === ESTILOS POR TIPO ===
  const getItemStyles = (item: TimelineItem) => {
    // METAS
    if (item.type === 'GOAL_CREATED') {
       return {
         bg: "bg-indigo-900/20",
         border: "border-indigo-500/30",
         bubble: "bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]",
         cardBg: "bg-indigo-900/10 hover:bg-indigo-900/20",
         text: "text-indigo-400",
         icon: <Target size={18} className="text-white" />
       };
    }
    if (item.type === 'GOAL_REACHED') {
       return {
         bg: "bg-purple-900/20",
         border: "border-purple-500/50",
         bubble: "bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.6)]",
         cardBg: "bg-gradient-to-r from-purple-900/20 to-pink-900/20",
         text: "text-purple-300",
         icon: <Trophy size={18} className="text-white" />
       };
    }

    // TRANSAÇÕES
    const t = item.data as Transaction;
    if (t.type === 'INCOME') {
      return {
        bg: "bg-emerald-900/20",
        border: "border-emerald-500/30",
        bubble: "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]",
        cardBg: "bg-emerald-900/10 hover:bg-emerald-900/20",
        text: "text-emerald-400",
        icon: <TrendingUp size={18} className="text-white" />
      };
    }
    
    const exp = t as ExpenseTransaction;
    if (exp.category === ExpenseCategory.FUEL) {
      return {
        bg: "bg-yellow-900/20",
        border: "border-yellow-500/30",
        bubble: "bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]",
        cardBg: "bg-yellow-900/10 hover:bg-yellow-900/20",
        text: "text-yellow-400",
        icon: <Fuel size={18} className="text-white" />
      };
    }
    
    if (exp.category === ExpenseCategory.MAINTENANCE) {
      return {
        bg: "bg-blue-900/20",
        border: "border-blue-500/30",
        bubble: "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]",
        cardBg: "bg-blue-900/10 hover:bg-blue-900/20",
        text: "text-blue-400",
        icon: <Wrench size={18} className="text-white" />
      };
    }
    
    return {
      bg: "bg-red-900/20",
      border: "border-red-500/30",
      bubble: "bg-red-500",
      cardBg: "bg-red-900/10 hover:bg-red-900/20",
      text: "text-red-400",
      icon: <ArrowDownCircle size={18} className="text-white" />
    };
  };

  return (
    <div className="min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom))] bg-gray-950">
      
      {/* HEADER FIXO */}
      <div className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-30 p-4 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Route className="text-emerald-500" /> Diário de Bordo
          </h1>
          <div className="flex w-full md:w-auto gap-3">
            <div className="relative flex-1 md:w-64">
              <Car className="absolute left-3 top-3 text-gray-500" size={16} />
              <select value={selectedVehicleId} onChange={(e) => handleVehicleChange(e.target.value)} className="w-full pl-10 bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 outline-none appearance-none">
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div className="relative flex-1 md:w-48">
              <Filter className="absolute left-3 top-3 text-gray-500" size={16} />
              <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="w-full pl-10 bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 outline-none appearance-none">
                <option value="ALL">Tudo</option>
                <option value="FUEL">Abastecimentos</option>
                <option value="MAINTENANCE">Manutenções</option>
                <option value="INCOME">Ganhos</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8">
        
        {loading ? (
          <TimelineSkeleton />
        ) : (
          <div className="relative space-y-12">
            
            {/* LINHA DE FUNDO */}
            <div className="absolute left-8 md:left-9 top-5 bottom-8 w-3 bg-gray-800 rounded-full hidden md:block shadow-inner border border-gray-700/50 z-0">
                <div className="w-full h-full border-l border-dashed border-gray-600/30 mx-auto w-0"></div>
            </div>

            {Object.entries(groupedItems).map(([month, items]) => (
              <div key={month} className="relative animate-fade-in-up z-10">
                
                {/* MÊS */}
                <div className="sticky top-24 z-20 mb-8 flex justify-center md:justify-start md:pl-20 pointer-events-none">
                   <div className="bg-gray-800/90 backdrop-blur border border-gray-600 text-emerald-400 px-6 py-1.5 rounded-lg text-sm font-bold shadow-lg uppercase tracking-wider flex items-center gap-2">
                      <Calendar size={14} /> {month}
                   </div>
                </div>

                <div className="space-y-8">
                  {items.map((item) => {
                    const styles = getItemStyles(item);
                    
                    const t = item.type === 'TRANSACTION' ? (item.data as Transaction) : null;
                    const g = (item.type === 'GOAL_CREATED' || item.type === 'GOAL_REACHED') ? (item.data as Goal) : null;
                    
                    const isFuel = t?.type === 'EXPENSE' && (t as ExpenseTransaction).category === ExpenseCategory.FUEL;
                    const fuelData = isFuel ? (t as FuelTransaction) : null;
                    const isIncome = t?.type === 'INCOME';
                    const incomeData = isIncome ? (t as IncomeTransaction) : null;

                    const appLogo = isIncome ? getAppLogo(t?.description) : null;

                    return (
                      <div key={item.id} className="relative md:pl-24 flex gap-4 group">
                        
                        {/* ÍCONE LATERAL */}
                        <div className={`
                            hidden md:flex absolute left-9 top-0 w-10 h-10 -ml-3.5 rounded-full border-4 border-gray-900 z-10 
                            items-center justify-center transition-transform duration-300 group-hover:scale-110 
                            ${styles.bubble}
                        `}>
                            {styles.icon}
                        </div>

                        {/* DATA MOBILE */}
                        <div className="md:hidden flex flex-col items-center min-w-[3.5rem] pt-1">
                           <span className="text-lg font-bold text-gray-300">{new Date(item.date).getDate()}</span>
                           <span className="text-[10px] text-gray-500 uppercase font-bold">{new Date(item.date).toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0,3)}</span>
                           <div className="h-full w-0.5 bg-gray-800 mt-2 rounded-full"></div>
                        </div>

                        {/* CARD */}
                        <div className="flex-1">
                           <div className={`
                              relative p-5 rounded-xl border transition-all duration-200 
                              active:scale-[0.98] hover:shadow-xl backdrop-blur-sm 
                              ${styles.border} ${styles.cardBg}
                           `}>
                             
                             {/* SETA (Clip Path) */}
                             <div className={`
                               hidden md:block absolute top-6 -left-2 w-4 h-4 transform rotate-45 border-l border-b bg-gray-950
                               ${styles.border}
                               [clip-path:polygon(0%_0%,_0%_100%,_100%_100%)]
                             `}>
                                <div className={`absolute inset-0 ${styles.cardBg}`}></div>
                             </div>

                             {/* CONTEÚDO */}
                             <div className="flex justify-between items-start gap-3">
                                <div className="flex items-start gap-3 flex-1">
                                   
                                   {/* Ícone Mobile */}
                                   <div className={`md:hidden p-2 rounded-lg bg-black/20 shrink-0`}>
                                      {React.cloneElement(styles.icon as any, { size: 16 })}
                                   </div>

                                   <div className="flex-1 min-w-0">
                                      {/* Título + Logo App */}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-bold text-gray-100 text-lg leading-tight truncate">
                                            {g ? (
                                              item.type === 'GOAL_CREATED' ? 'Nova Meta Definida' : 'Meta Conquistada!'
                                            ) : (
                                              isFuel ? 'Abastecimento' : isIncome ? 'Receita Recebida' : (t?.description || 'Despesa')
                                            )}
                                        </h3>
                                        {/* LOGO DO APP (Miniatura) */}
                                        {appLogo && (
                                          <img src={appLogo} alt="App" className="w-5 h-5 rounded-full object-cover border border-white/10" />
                                        )}
                                      </div>

                                      {/* Subtítulo: Datas e Descrições */}
                                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                         <span className="text-xs text-gray-400 bg-black/20 px-2 py-0.5 rounded font-mono border border-white/5">
                                            {formatDate(item.date)}
                                         </span>

                                         {g && (
                                           <span className="text-xs text-gray-300 flex items-center gap-1">
                                              {g.title}
                                           </span>
                                         )}

                                         {isFuel && fuelData?.stationName && (
                                            <span className="text-xs flex items-center gap-1 text-yellow-500/80 truncate">
                                               <MapPin size={12}/> {fuelData.stationName}
                                            </span>
                                         )}
                                      </div>

                                      {/* === METAS: BARRA DE PROGRESSO & PRAZO === */}
                                      {g && item.type === 'GOAL_CREATED' && (
                                          <div className="mt-3 w-full bg-black/30 rounded-full h-1.5 border border-white/5 overflow-hidden flex">
                                            <div 
                                              className="bg-indigo-500 h-full rounded-full" 
                                              style={{ width: `${Math.min((g.current_amount / g.target_amount) * 100, 100)}%` }}
                                            ></div>
                                          </div>
                                      )}
                                      {g && g.deadline && (
                                          <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-300/80">
                                             <CalendarDays size={12} /> Prazo: {formatDate(g.deadline)}
                                          </div>
                                      )}

                                      {/* === GRID DE DETALHES (Trip Info, Fuel, etc) === */}
                                      {(t?.odometer || (fuelData) || (incomeData)) && (
                                          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                              
                                              {/* Odômetro */}
                                              {t?.odometer && t.odometer > 0 && (
                                                <div className="flex flex-col p-1.5 rounded bg-black/20 border border-white/5">
                                                    <span className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5 flex items-center gap-1"><Gauge size={8}/> Odômetro</span>
                                                    <span className="text-xs font-mono text-gray-300">{formatNumber(t.odometer)} km</span>
                                                </div>
                                              )}

                                              {/* Combustível */}
                                              {isFuel && fuelData && (
                                                <div className="flex flex-col p-1.5 rounded bg-black/20 border border-white/5">
                                                    <span className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5 flex items-center gap-1"><Droplets size={8}/> Litros</span>
                                                    <div className="flex items-center gap-1">
                                                      <span className="text-xs font-mono text-gray-300">{fuelData.liters} L</span>
                                                      {fuelData.fullTank && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Tanque Cheio"/>}
                                                    </div>
                                                </div>
                                              )}

                                              {/* === RECEITAS: INFORMAÇÕES COMPLETAS DE TRIP === */}
                                              {isIncome && incomeData && (
                                                  <>
                                                    {/* Distância Percorrida */}
                                                    {incomeData.distanceDriven > 0 && (
                                                      <div className="flex flex-col p-1.5 rounded bg-black/20 border border-white/5">
                                                          <span className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5 flex items-center gap-1"><Navigation size={8}/> Distância</span>
                                                          <span className="text-xs font-mono text-white">{incomeData.distanceDriven} km</span>
                                                      </div>
                                                    )}

                                                    {/* Tempo / Duração */}
                                                    {incomeData.durationMinutes > 0 && (
                                                      <div className="flex flex-col p-1.5 rounded bg-black/20 border border-white/5">
                                                          <span className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5 flex items-center gap-1"><Clock size={8}/> Tempo</span>
                                                          <span className="text-xs font-mono text-white">{formatTimeDuration(incomeData.durationMinutes)}</span>
                                                      </div>
                                                    )}

                                                    {/* Eficiência (R$/km) */}
                                                    {incomeData.distanceDriven > 0 && (
                                                      <div className="flex flex-col p-1.5 rounded bg-black/20 border border-white/5">
                                                          <span className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5 flex items-center gap-1"><TrendingUp size={8}/> R$/Km</span>
                                                          <span className="text-xs font-mono text-emerald-400">
                                                            R$ {((t!.amount / 100) / incomeData.distanceDriven).toFixed(2)}
                                                          </span>
                                                      </div>
                                                    )}
                                                  </>
                                              )}
                                          </div>
                                      )}
                                   </div>
                                </div>

                                {/* Valor / Status (Direita) */}
                                <div className="text-right shrink-0">
                                   {g ? (
                                      <div className="flex flex-col items-end">
                                        <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-0.5">Alvo</span>
                                        <span className={`text-lg font-bold ${styles.text}`}>
                                           {formatMoney(g.target_amount)}
                                        </span>
                                        {item.type === 'GOAL_REACHED' && (
                                          <span className="flex items-center gap-1 text-xs text-purple-400 bg-purple-900/40 px-2 py-0.5 rounded-full mt-1">
                                            <CheckCircle2 size={10} /> Concluída
                                          </span>
                                        )}
                                      </div>
                                   ) : (
                                      <span className={`text-xl font-bold whitespace-nowrap block ${styles.text}`}>
                                         {isIncome ? '+' : '-'}{formatMoney(t!.amount)}
                                      </span>
                                   )}
                                </div>
                             </div>

                           </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* EVENTO FIXO: INÍCIO */}
            <div className="relative md:pl-24 flex gap-4 group z-10 pb-10">
              <div className="absolute left-8 md:left-9 top-0 h-8 w-3 bg-gray-800 rounded-b-full hidden md:block z-0">
                  <div className="w-full h-full border-l border-dashed border-gray-600/30 mx-auto w-0"></div>
              </div>
              <div className="hidden md:flex absolute left-9 top-0 w-10 h-10 -ml-3.5 rounded-full border-4 border-gray-900 z-10 items-center justify-center bg-gray-800 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <Flag size={18} className="text-emerald-400" />
              </div>
              <div className="md:hidden flex flex-col items-center min-w-[3.5rem] pt-1">
                 <Flag size={18} className="text-emerald-500" />
              </div>
              <div className="flex-1 relative z-10">
                 <div className="relative p-6 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-950/20 backdrop-blur-sm hover:border-emerald-500/40 transition-all shadow-lg">
                    <div className="hidden md:block absolute top-4 -left-2 w-4 h-4 transform rotate-45 border-l border-b border-emerald-500/20 bg-gray-950 [clip-path:polygon(0%_0%,_0%_100%,_100%_100%)]">
                        <div className="absolute inset-0 bg-gray-900/50"></div>
                    </div>
                    <div className="flex items-start gap-4">
                       <div className="p-3 bg-emerald-500/10 rounded-full hidden sm:block">
                          <Route className="text-emerald-500" size={24} />
                       </div>
                       <div>
                          <h3 className="font-bold text-emerald-400 text-xl leading-tight mb-1">Bem-Vindo à Financial Drive Hub!</h3>
                          <p className="text-sm text-gray-400 font-medium">Sua jornada começa aqui.</p>
                          <div className="mt-4 pt-4 border-t border-gray-800 text-sm text-gray-400 italic leading-relaxed">
                            "Não é apenas sobre chegar ao destino, é sobre o quanto você lucra no caminho. Mantenha o controle e acelere seus resultados."
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}