// app/routes/timeline.tsx

import { useEffect, useState, useMemo, useCallback } from "react";
import React from "react";
import { 
  Calendar, Wrench, Fuel, TrendingUp, Filter, 
  Car, MapPin, ArrowDownCircle, Route, Flag,
  Gauge, Droplets, DollarSign, Timer, Navigation,
  Target, Trophy, CheckCircle2, CalendarDays, Clock,
  Layers, Briefcase, Map as MapIcon, Globe, Hash
} from "lucide-react";
import { supabase } from "~/lib/supabase.client";
import { ExpenseCategory, Platform } from "~/types/enums";
import type { User } from "@supabase/supabase-js";

// === TYPES ===
interface PlatformConfigItem {
  label: string;
  logo?: string;
  icon?: React.ReactElement; // Tipagem mais específica para evitar erro no cloneElement
  bg: string;
  color: string;
}

type TimelineEventType = 'TRANSACTION' | 'GOAL_CREATED' | 'GOAL_REACHED';

interface TimelineItem {
  id: string;
  date: string;
  type: TimelineEventType;
  data: any;
  sortDate: number;
}

// === CONFIGURAÇÕES ===
const PLATFORM_CONFIG: Record<string, PlatformConfigItem> = {
  [Platform.UBER]: { label: 'Uber', logo: '/logos/uber.png', bg: 'bg-black', color: 'text-white' },
  [Platform.NINETY_NINE]: { label: '99', logo: '/logos/99.png', bg: 'bg-yellow-400', color: 'text-black' },
  [Platform.IFOOD]: { label: 'iFood', logo: '/logos/ifood.png', bg: 'bg-red-500', color: 'text-white' },
  [Platform.INDRIVER]: { label: 'InDrive', logo: '/logos/indriver.png', bg: 'bg-green-500', color: 'text-white' },
  'ZE_DELIVERY': { label: 'Zé Delivery', logo: '/logos/ze-delivery.png', bg: 'bg-yellow-500', color: 'text-black' },
  [Platform.PARTICULAR]: { label: 'Particular', icon: <Briefcase size={20}/>, bg: 'bg-blue-600', color: 'text-white' },
  'MULTIPLE': { label: 'Múltiplos Apps', icon: <Layers size={20}/>, bg: 'bg-indigo-600', color: 'text-white' }
};

const FUEL_TRANSLATIONS: Record<string, string> = {
  'GASOLINE': 'Gasolina',
  'ETHANOL': 'Etanol',
  'DIESEL': 'Diesel',
  'CNG': 'GNV',
  'ELECTRIC': 'Elétrico'
};

// === UTILITÁRIOS ===

// Para Transações (geralmente salvas em centavos: 120000 = R$ 1.200,00)
const formatCurrencyCents = (val: number) => 
  (val / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Para Metas (geralmente salvas em valor bruto: 1200 = R$ 1.200,00)
const formatCurrencyRaw = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatNumber = (val: number) => 
  val ? val.toLocaleString('pt-BR') : '0';

const formatTime = (dateString: string) => {
  if (!dateString) return '--:--';
  const date = new Date(dateString);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const getMonthYear = (dateString: string) => {
  const date = new Date(dateString);
  const str = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Função auxiliar com tipagem correta para o TypeScript
const cloneIcon = (icon: React.ReactElement | undefined, size: number) => {
  if (React.isValidElement(icon)) {
    // Casting explícito para dizer ao TS que este elemento aceita 'size'
    return React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size });
  }
  return icon;
};

// === SKELETON ===
function TimelineSkeleton() {
  return (
    <div className="space-y-8 animate-pulse mt-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="relative md:pl-28 flex gap-4">
          <div className="hidden md:block absolute left-14 top-0 w-10 h-10 -ml-5 rounded-full bg-gray-800 border-4 border-gray-900 z-10" />
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
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'FUEL' | 'MAINTENANCE'>('ALL');

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // Veículos
  const fetchVehicles = useCallback(async () => {
    if (!user) return;
    const { data: vData } = await supabase.from('vehicles').select('*').eq('user_id', user.id);

    if (vData) {
      setVehicles(vData);
      if (vData.length > 0 && !selectedVehicleId) {
        const { data: pData } = await supabase.from('profiles').select('last_selected_vehicle_id').eq('id', user.id).single();
        if (pData?.last_selected_vehicle_id) setSelectedVehicleId(pData.last_selected_vehicle_id);
        else setSelectedVehicleId(vData[0].id);
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

  // Dados
  const fetchData = useCallback(async () => {
    if (!selectedVehicleId || !user) return;
    setLoading(true);

    try {
      const { data: transData } = await supabase
        .from('transactions')
        .select('*')
        .eq('vehicle_id', selectedVehicleId)
        .order('date', { ascending: false });

      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id);

      let items: TimelineItem[] = [];

      if (transData) {
        const tItems: TimelineItem[] = transData.map((t: any) => ({
          id: t.id,
          date: t.date,
          type: 'TRANSACTION',
          data: {
            ...t,
            distanceDriven: t.distance || t.distance_driven || 0,
            odometer: t.odometer || 0,
            stationName: t.station_name,
            liters: t.liters,
            fullTank: t.is_full_tank,
            fuelType: t.fuel_type,
            split: t.split 
          },
          sortDate: new Date(t.date).getTime()
        }));
        items = [...items, ...tItems];
      }

      if (goalsData) {
        goalsData.forEach((g: any) => {
          items.push({
            id: `goal-created-${g.id}`,
            date: g.created_at,
            type: 'GOAL_CREATED',
            data: g,
            sortDate: new Date(g.created_at).getTime()
          });

          if (g.status === 'COMPLETED' || g.achieved_at) {
             const dateAchieved = g.achieved_at || g.updated_at || new Date().toISOString(); 
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

  // Agrupamento
  const groupedItems = useMemo(() => {
    const filtered = timelineItems.filter(item => {
      if (item.type !== 'TRANSACTION') return true; 
      
      const t = item.data;
      if (filterType === 'ALL') return true;
      if (filterType === 'INCOME') return t.type === 'INCOME';
      if (filterType === 'EXPENSE') return t.type === 'EXPENSE' && t.category !== ExpenseCategory.FUEL;
      if (filterType === 'FUEL') return t.type === 'EXPENSE' && t.category === ExpenseCategory.FUEL;
      if (filterType === 'MAINTENANCE') return t.type === 'EXPENSE' && t.category === ExpenseCategory.MAINTENANCE;
      return true;
    });

    return filtered.reduce((groups, item) => {
      const key = getMonthYear(item.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {} as Record<string, TimelineItem[]>);
  }, [timelineItems, filterType]);

  // Helper para buscar nome do veículo
  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? vehicle.name : 'Veículo';
  };

  const getItemStyles = (item: TimelineItem) => {
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

    const t = item.data;
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
    
    if (t.category === ExpenseCategory.FUEL) {
      return {
        bg: "bg-yellow-900/20",
        border: "border-yellow-500/30",
        bubble: "bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]",
        cardBg: "bg-yellow-900/10 hover:bg-yellow-900/20",
        text: "text-yellow-400",
        icon: <Fuel size={18} className="text-white" />
      };
    }
    
    if (t.category === ExpenseCategory.MAINTENANCE) {
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
      
      <div className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-30 p-4 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Route className="text-emerald-500" /> Linha do Tempo
          </h1>
          <div className="flex w-full md:w-auto gap-3">
            <div className="relative flex-1 md:w-64">
              <Car className="absolute left-3 top-3 text-gray-500" size={16} />
              <select value={selectedVehicleId} onChange={(e) => { setSelectedVehicleId(e.target.value); supabase.from('profiles').update({ last_selected_vehicle_id: e.target.value }).eq('id', user?.id); }} className="w-full pl-10 bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 outline-none appearance-none">
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div className="relative flex-1 md:w-48">
              <Filter className="absolute left-3 top-3 text-gray-500" size={16} />
              <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="w-full pl-10 bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 outline-none appearance-none">
                <option value="ALL">Tudo</option>
                <option value="INCOME">Receitas</option>
                <option value="FUEL">Abastecimentos</option>
                <option value="MAINTENANCE">Manutenções</option>
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
            
            {/* LINHA DE FUNDO CENTRALIZADA */}
            {/* Mobile: Centralizado na div de data. Desktop: Centralizado no ícone (left-14) */}
            <div className="absolute left-[1.75rem] md:left-14 top-5 bottom-8 w-1 -translate-x-1/2 bg-gray-800 rounded-full shadow-inner border border-gray-700/50 z-0">
                <div className="w-full h-full border-l border-dashed border-gray-600/30 mx-auto w-0"></div>
            </div>

            {Object.entries(groupedItems).map(([month, items]) => (
              <div key={month} className="relative animate-fade-in-up z-10">
                
                <div className="sticky top-24 z-20 mb-8 flex justify-center md:justify-start md:pl-28 pointer-events-none">
                   <div className="bg-gray-800/90 backdrop-blur border border-gray-600 text-emerald-400 px-6 py-1.5 rounded-lg text-sm font-bold shadow-lg uppercase tracking-wider flex items-center gap-2">
                      <Calendar size={14} /> {month}
                   </div>
                </div>

                <div className="space-y-8">
                  {items.map((item) => {
                    const styles = getItemStyles(item);
                    
                    const t = item.type === 'TRANSACTION' ? item.data : null;
                    const g = (item.type === 'GOAL_CREATED' || item.type === 'GOAL_REACHED') ? item.data : null;
                    
                    const isFuel = t?.category === ExpenseCategory.FUEL;
                    const isIncome = t?.type === 'INCOME';
                    const isGoalCreated = item.type === 'GOAL_CREATED';

                    let platformConfig: PlatformConfigItem | null = null;
                    let splitPlatforms: PlatformConfigItem[] = [];
                    
                    if (isIncome) {
                        if (t.platform === 'MULTIPLE' && t.split) {
                            platformConfig = PLATFORM_CONFIG['MULTIPLE'];
                            splitPlatforms = t.split.map((s: any) => PLATFORM_CONFIG[s.platform] || PLATFORM_CONFIG['PARTICULAR']);
                        } else {
                            platformConfig = PLATFORM_CONFIG[t.platform] || PLATFORM_CONFIG['PARTICULAR'];
                        }
                    }

                    // Checa vínculo da meta
                    const linkedIds = g?.linked_vehicle_ids || []; // Array
                    const isGoalGeneral = linkedIds.length === 0;
                    const goalVehicleName = !isGoalGeneral ? getVehicleName(linkedIds[0]) : null;

                    return (
                      <div key={item.id} className="relative md:pl-28 flex gap-4 group">
                        
                        {/* ÍCONE LATERAL - Centralizado em md:left-14 */}
                        <div className={`
                            hidden md:flex absolute left-14 top-0 w-10 h-10 -ml-5 rounded-full border-4 border-gray-900 z-10 
                            items-center justify-center transition-transform duration-300 group-hover:scale-110 
                            ${styles.bubble}
                        `}>
                            {styles.icon}
                        </div>

                        {/* DATA MOBILE - Centralizada na linha */}
                        <div className="md:hidden flex flex-col items-center min-w-[3.5rem] pt-1 z-10 bg-gray-950 py-2">
                           <span className="text-lg font-bold text-gray-300">{new Date(item.date).getDate()}</span>
                           <span className="text-[10px] text-gray-500 uppercase font-bold">{new Date(item.date).toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0,3)}</span>
                        </div>

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

                             <div className="flex justify-between items-start gap-3">
                                <div className="flex items-start gap-3 flex-1">
                                   
                                   <div className={`md:hidden p-2 rounded-lg bg-black/20 shrink-0 ${isIncome ? 'hidden' : 'block'}`}>
                                      {cloneIcon(styles.icon, 16)}
                                   </div>

                                   {isIncome && platformConfig && (
                                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm overflow-hidden ${platformConfig.bg}`}>
                                        {platformConfig.logo ? (
                                            <img src={platformConfig.logo} alt="App" className="w-full h-full object-cover" />
                                        ) : (
                                            platformConfig.icon
                                        )}
                                     </div>
                                   )}

                                   <div className="flex-1 min-w-0">
                                      <div className="flex flex-col">
                                        <h3 className="font-bold text-gray-100 text-lg leading-tight truncate flex items-center gap-2">
                                            {g ? (
                                              item.type === 'GOAL_CREATED' ? 'Meta Criada' : 'Meta Conquistada!'
                                            ) : (
                                              isFuel ? 'Abastecimento' : isIncome ? 'Receita Recebida' : (t?.description || 'Despesa')
                                            )}
                                            
                                            {isIncome && splitPlatforms.length > 0 && (
                                                <div className="flex -space-x-1.5 ml-2">
                                                    {splitPlatforms.map((p, idx) => (
                                                        <div key={idx} className={`w-5 h-5 rounded-full border border-gray-800 flex items-center justify-center overflow-hidden ${p.bg}`}>
                                                            {p.logo ? <img src={p.logo} alt="" className="w-full h-full object-cover"/> : <Briefcase size={10} className="text-white"/>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </h3>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2 mt-2">
                                         <span className="text-xs text-gray-400 bg-black/20 px-2 py-0.5 rounded font-mono border border-white/5 flex items-center gap-1">
                                            <Clock size={10} /> {formatTime(item.date)}
                                         </span>

                                         {g && (
                                           <>
                                             <span className="text-sm text-gray-200 font-bold flex items-center gap-1">
                                                {g.title}
                                             </span>
                                             {/* TAG: GERAL OU VEÍCULO */}
                                             <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                                                 isGoalGeneral 
                                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
                                                    : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                                             }`}>
                                                {isGoalGeneral ? (
                                                    <span className="flex items-center gap-1"><Globe size={8}/> Geral</span>
                                                ) : (
                                                    <span className="flex items-center gap-1"><Car size={8}/> {goalVehicleName}</span>
                                                )}
                                             </span>
                                           </>
                                         )}

                                         {isFuel && t?.stationName && (
                                            <span className="text-xs flex items-center gap-1 text-yellow-500/90 font-bold truncate">
                                               <MapPin size={12}/> {t.stationName}
                                            </span>
                                         )}
                                      </div>

                                      {/* META: ALVO (Sem dividir por 100 - Raw Value) */}
                                      {g && isGoalCreated && (
                                          <div className="mt-3 flex items-center gap-2">
                                              <span className="text-xs uppercase text-gray-500 font-bold">Alvo Definido:</span>
                                              <span className="text-indigo-400 font-bold text-base bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                                  {formatCurrencyRaw(g.target_amount)}
                                              </span>
                                          </div>
                                      )}

                                      {isIncome && (
                                          <div className="mt-4 flex gap-3 flex-wrap">
                                              {t.distanceDriven > 0 && (
                                                <div className="flex items-center gap-2 bg-black/20 px-2 py-1.5 rounded border border-white/5">
                                                    <div className="p-1 bg-blue-500/20 rounded-full"><MapIcon size={12} className="text-blue-400"/></div>
                                                    <div>
                                                        <span className="text-[9px] text-gray-500 uppercase block leading-none">Trip</span>
                                                        <span className="text-xs font-mono text-white">{t.distanceDriven} km</span>
                                                    </div>
                                                </div>
                                              )}
                                              {t.odometer > 0 && (
                                                <div className="flex items-center gap-2 bg-black/20 px-2 py-1.5 rounded border border-white/5">
                                                    <div className="p-1 bg-emerald-500/20 rounded-full"><Gauge size={12} className="text-emerald-400"/></div>
                                                    <div>
                                                        <span className="text-[9px] text-gray-500 uppercase block leading-none">Odômetro</span>
                                                        <span className="text-xs font-mono text-white">{formatNumber(t.odometer)} km</span>
                                                    </div>
                                                </div>
                                              )}
                                          </div>
                                      )}

                                      {isFuel && (
                                        <div className="mt-4 grid grid-cols-2 gap-2">
                                            <div className="flex items-center gap-2 bg-black/20 px-2 py-1.5 rounded border border-white/5">
                                                <div className="p-1 bg-yellow-500/20 rounded-full"><Fuel size={12} className="text-yellow-400"/></div>
                                                <div>
                                                    <span className="text-[9px] text-gray-500 uppercase block leading-none">Combustível</span>
                                                    <span className="text-xs font-bold text-white uppercase">
                                                        {FUEL_TRANSLATIONS[t.fuelType?.toUpperCase()] || t.fuelType || 'Comum'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 bg-black/20 px-2 py-1.5 rounded border border-white/5">
                                                <div className="p-1 bg-orange-500/20 rounded-full"><Droplets size={12} className="text-orange-400"/></div>
                                                <div>
                                                    <span className="text-[9px] text-gray-500 uppercase block leading-none">Volume</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs font-mono text-white">{t.liters} L</span>
                                                        {t.fullTank && (
                                                            <span className="text-[9px] bg-emerald-500 text-gray-900 px-1 rounded font-bold" title="Tanque Cheio">FULL</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                      )}

                                   </div>
                                </div>

                                <div className="text-right shrink-0 flex flex-col items-end justify-between h-full min-h-[50px]">
                                   {g ? (
                                      <div className="flex flex-col items-end">
                                        {item.type === 'GOAL_REACHED' ? (
                                          <span className="flex items-center gap-1 text-xs text-purple-400 bg-purple-900/40 px-2 py-0.5 rounded-full mt-1 border border-purple-500/30">
                                            <CheckCircle2 size={12} /> Concluída
                                          </span>
                                        ) : (
                                            <span className="text-xs text-indigo-300 bg-indigo-900/40 px-2 py-1 rounded-lg border border-indigo-500/30">
                                                Iniciada
                                            </span>
                                        )}
                                      </div>
                                   ) : (
                                      // TRANSAÇÕES: USA FORMATO DE CENTAVOS
                                      <span className={`text-xl font-bold whitespace-nowrap block ${styles.text}`}>
                                         {isIncome ? '+' : '-'}{formatCurrencyCents(t!.amount)}
                                      </span>
                                   )}

                                   {/* ID DISCRETO NO RODAPÉ DO CARD */}
                                   <div className="mt-auto pt-2 opacity-30 hover:opacity-100 transition-opacity flex items-center justify-end">
                                      <span className="text-[9px] text-gray-500 font-mono flex items-center gap-0.5 cursor-text select-all">
                                         <Hash size={8} /> {item.id.slice(0, 4)}...
                                      </span>
                                   </div>
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
            
            {/* CARD INICIAL - Linha conectando ao centro */}
            <div className="relative md:pl-28 flex gap-4 group z-10 pb-10">
              {/* O alinhamento left-14 e -ml-5 garante que esteja centralizado com a linha principal */}
              <div className="hidden md:flex absolute left-14 top-0 w-10 h-10 -ml-5 rounded-full border-4 border-gray-900 z-10 items-center justify-center bg-gray-800 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <Flag size={18} className="text-emerald-400" />
              </div>
              <div className="md:hidden flex flex-col items-center min-w-[3.5rem] pt-1 z-10 bg-gray-950">
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
                          <h3 className="font-bold text-emerald-400 text-xl leading-tight mb-1">Início da Jornada</h3>
                          <p className="text-sm text-gray-400 font-medium">Bem-vindo ao Financial Drive Hub.</p>
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