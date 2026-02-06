// app/routes/modelo-timeline.tsx

import { useEffect, useState, useMemo, useCallback } from "react";
import { 
  Wrench, Fuel, TrendingUp, 
  Globe, Zap, Calendar, Share2,
  ChevronDown, Search, AlertCircle, Flag, Rocket,
  Layers, DollarSign, MapPin, Gauge, Briefcase, Check
} from "lucide-react";
import { supabase } from "~/lib/supabase.client";
import { ExpenseCategory, Platform } from "~/types/enums";
import type { User } from "@supabase/supabase-js";

// === TYPES ===
interface TimelineItem {
  id: string;
  date: string;
  type: 'TRANSACTION' | 'GOAL_CREATED' | 'GOAL_REACHED';
  data: any;
  sortDate: number;
}

// === CONSTANTS ===
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

const formatDateWithTime = (dateString: string) => {
  if (!dateString) return '--/-- às --:--';
  const date = new Date(dateString);
  const datePart = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const timePart = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} às ${timePart}`;
};

// === CONFIGURAÇÃO DAS PLATAFORMAS ===
const ALL_PLATFORMS = [
  { 
    id: Platform.UBER, 
    label: 'Uber', 
    logo: '/logos/uber.png', 
    bg: 'bg-black',
    textColor: 'text-white'
  },
  { 
    id: Platform.NINETY_NINE, 
    label: '99', 
    logo: '/logos/99.png', 
    bg: 'bg-yellow-400',
    textColor: 'text-black'
  },
  { 
    id: Platform.IFOOD, 
    label: 'iFood', 
    logo: '/logos/ifood.png', 
    bg: 'bg-red-500',
    textColor: 'text-white'
  },
  { 
    id: 'ZE_DELIVERY' as Platform, 
    label: 'Zé Delivery', 
    logo: '/logos/ze-delivery.png', 
    bg: 'bg-yellow-500',
    textColor: 'text-black'
  },
  { 
    id: Platform.INDRIVER, 
    label: 'InDrive', 
    logo: '/logos/indriver.png', 
    bg: 'bg-green-500',
    textColor: 'text-white'
  },
  { 
    id: Platform.PARTICULAR, 
    label: 'Particular', 
    logo: '', 
    icon: <Briefcase size={28} className="text-white" />,
    bg: 'bg-blue-600',
    textColor: 'text-white'
  },
];

// Configuração Visual para MULTIPLE
const MULTIPLE_PLATFORM_CONFIG = {
  id: 'MULTIPLE',
  label: 'Múltiplos Apps',
  icon: <Layers size={32} className="text-white" />, 
  bg: 'bg-indigo-600',
  textColor: 'text-white'
};

const getAppIcon = (platform: string, isMultiple: boolean = false) => {
  if (isMultiple) {
    return MULTIPLE_PLATFORM_CONFIG;
  }
  
  return ALL_PLATFORMS.find(p => p.id === platform) || ALL_PLATFORMS[ALL_PLATFORMS.length - 1];
};

const formatCurrencyCents = (val: number) => 
  (val / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });



// === HEADER COMPONENT ===
function Header({ vehicles, selectedVehicleId, onVehicleChange }: any) {
  const [open, setOpen] = useState(false);

  const brandSlugFrom = (brand?: string) => {
    if (!brand) return '';
    return brand.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  };

  const selected = vehicles.find((v: any) => v.id === selectedVehicleId) || vehicles[0];

  const orderedVehicles = useMemo(() => {
    if (!vehicles || vehicles.length === 0) return [];
    const copy = [...vehicles];
    // Ordena alfabeticamente por modelo ou nome
    copy.sort((a: any, b: any) => {
      const A = (a.model || a.name || '').toString().toLowerCase();
      const B = (b.model || b.name || '').toString().toLowerCase();
      return A.localeCompare(B, 'pt-BR', { sensitivity: 'base' });
    });

    // Encontrar veículo selecionado e colocá-lo na primeira posição
    if (selectedVehicleId) {
      const idx = copy.findIndex((c: any) => c.id === selectedVehicleId);
      if (idx > 0) {
        const [sel] = copy.splice(idx, 1);
        copy.unshift(sel);
      }
    }

    return copy;
  }, [vehicles, selectedVehicleId]);

  return (
    <header className="flex items-center justify-between border-b border-slate-700/30 px-8 py-4 bg-slate-950 dark:bg-slate-950 z-10">
      <div className="flex items-center gap-6 flex-1 max-w-2xl">
        <h2 className="text-lg font-bold tracking-tight whitespace-nowrap">Highway Logbook</h2>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            className="w-full bg-slate-800/50 border-none rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 transition-all"
            placeholder="Buscar lançamentos..."
            type="text"
          />
        </div>
      </div>

      {/* Vehicle Selector - Modern */}
      <div className="ml-6 relative">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none">
          <div className="h-8 w-8 rounded-md bg-slate-700 overflow-hidden flex items-center justify-center">
            {selected?.brand ? (
              <img
                src={`/logos/brands/${brandSlugFrom(selected.brand)}.png`}
                alt={selected.brand}
                className="w-full h-full object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <Briefcase size={18} />
            )}
          </div>
          <div className="text-left">
            <div className="text-sm font-bold truncate">{selected?.model || selected?.name}</div>
            <div className="text-[11px] text-slate-400 truncate">{selected?.licensePlate ? `${selected.licensePlate} • ${selected.currentOdometer?.toLocaleString?.('pt-BR') || '—'} km` : selected?.name}</div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 ml-2" />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl p-2 shadow-2xl z-50">
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
              {orderedVehicles.map((v: any) => (
                <button key={v.id} onClick={() => { onVehicleChange(v.id); setOpen(false); }} className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 ${v.id === selectedVehicleId ? 'bg-slate-800/60' : ''}`}>
                  <div className="h-10 w-10 rounded-md bg-slate-700 overflow-hidden flex items-center justify-center">
                    {v.brand ? (
                      <img src={`/logos/brands/${brandSlugFrom(v.brand)}.png`} alt={v.brand} className="w-full h-full object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <Briefcase size={20} />
                    )}
                  </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold truncate">{v.model || v.name}</div>
                        <div className="text-xs text-slate-400 truncate">{v.licensePlate || '—'} • {(v.currentOdometer || 0).toLocaleString('pt-BR')} km</div>
                      </div>
                      {v.id === selectedVehicleId && (
                        <div className="flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          <Check size={12} />
                          <span>Ativo</span>
                        </div>
                      )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

// === TIMELINE ITEM COMPONENT ===
interface TimelineTransactionProps {
  position: 'left' | 'right';
  type: 'income' | 'fuel' | 'maintenance' | 'expense';
  icon: React.ReactNode;
  title: string;
  time: string;
  description: string;
  amount: string;
  subtitle?: string;
  platformConfig?: any;
  tripDistance?: number;
  odometer?: number;
  fuelType?: string;
  fuelVolume?: number;
  location?: string;
  pricePerLiter?: number;
}

function TimelineTransaction({ position, type, icon, title, time, description, amount, subtitle, platformConfig, tripDistance, odometer, fuelType, fuelVolume, location, pricePerLiter }: TimelineTransactionProps) {
  const colorMap = {
    income: { dot: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-500', gradient: 'from-emerald-500 to-emerald-500/20' },
    fuel: { dot: 'bg-yellow-500', border: 'border-yellow-500', text: 'text-yellow-500', gradient: 'from-yellow-500 to-yellow-500/20' },
    maintenance: { dot: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-500', gradient: 'from-blue-500 to-blue-500/20' },
    expense: { dot: 'bg-red-500', border: 'border-red-500', text: 'text-red-500', gradient: 'from-red-500 to-red-500/20' },
  };

  const colors = colorMap[type];
  const isRight = position === 'right';
  const hasIncomeDetails = tripDistance !== undefined && odometer !== undefined;
  const hasFuelDetails = fuelType !== undefined && fuelVolume !== undefined;

  // Renderizar logo ou ícone da plataforma
  const renderPlatformBadge = () => {
    if (!platformConfig) return null;
    
    if (platformConfig.logo) {
      return (
        <img src={platformConfig.logo} alt={platformConfig.label} className="w-8 h-8 rounded object-cover flex-shrink-0" />
      );
    }
    if (platformConfig.icon) {
      return (
        <div className={`${platformConfig.bg} p-1 rounded flex items-center justify-center flex-shrink-0 w-8 h-8`}>
          {platformConfig.icon}
        </div>
      );
    }
    return null;
  };

  // Conteúdo do card
  const cardContent = (
    <div className={`bg-slate-900 ${isRight ? 'border-l-4 rounded-r-xl rounded-bl-none' : 'border-r-4 rounded-l-xl rounded-br-none'} ${colors.border} p-5 shadow-2xl flex-1 max-w-sm`}>
      {/* Cabeçalho: Logo + Plataforma + Data */}
      <div className="flex justify-between items-center mb-2 gap-2">
        <div className="flex items-center gap-1.5">
          {platformConfig && renderPlatformBadge()}
          {platformConfig && <span className={`text-xs font-bold ${colors.text} uppercase`}>{platformConfig.label}</span>}
        </div>
        <span className="text-xs text-slate-400 whitespace-nowrap">{time}</span>
      </div>
      
      {/* Título */}
      <h3 className={`text-base font-black ${colors.text} uppercase mb-2`}>{title}</h3>
      
      {/* Descrição */}
      <p className="text-sm text-slate-100 font-medium mb-3">{description}</p>

      {/* Detalhes de renda (Trip e Odômetro) */}
      {hasIncomeDetails && (
        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-800/50 px-2.5 py-1.5 rounded-lg">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-slate-500 text-xs">Trip</p>
              <p className="text-slate-100 font-semibold">{tripDistance} km</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800/50 px-2.5 py-1.5 rounded-lg">
            <Gauge className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-slate-500 text-xs">Odômetro</p>
              <p className="text-slate-100 font-semibold">{odometer.toLocaleString('pt-BR')} km</p>
            </div>
          </div>
        </div>
      )}

      {/* Detalhes de combustível (Tipo, Volume, Preço por litro) */}
      {hasFuelDetails && (
        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-800/50 px-2.5 py-1.5 rounded-lg">
            <Fuel className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-slate-500 text-xs">Combustível</p>
              <p className="text-slate-100 font-semibold">{fuelType}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800/50 px-2.5 py-1.5 rounded-lg">
            <Gauge className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-slate-500 text-xs">Volume</p>
              <p className="text-slate-100 font-semibold">{fuelVolume} L</p>
            </div>
          </div>
          {pricePerLiter !== undefined && (
            <div className="flex items-center gap-1.5 bg-slate-800/50 px-2.5 py-1.5 rounded-lg">
              <DollarSign className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-slate-500 text-xs">Preço/L</p>
                <p className="text-slate-100 font-semibold">R$ {pricePerLiter.toFixed(2).replace('.', ',')}</p>
              </div>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-1.5 bg-slate-800/50 px-2.5 py-1.5 rounded-lg">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-slate-500 text-xs">Local</p>
                <p className="text-slate-100 font-semibold truncate">{location}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {subtitle && !hasIncomeDetails && <p className="text-sm text-slate-400 mb-4">{subtitle}</p>}
      
      {/* Valor */}
      <div className="flex justify-between items-center">
        <span className="text-xl font-black text-white">{amount}</span>
      </div>
    </div>
  );

  return (
    <div className="flex items-center w-full">
      {!isRight ? (
        <>
          {/* LEFT SIDE: Card + Line + Spacer */}
          <div className="w-1/2 flex items-center justify-end">
            {cardContent}
            <div className={`h-1 w-12 bg-gradient-to-l ${colors.gradient}`} />
          </div>
          
          {/* Dot no centro */}
          <div className="relative z-10 flex flex-shrink-0 items-center justify-center w-12">
            <div className={`w-4 h-4 ${colors.dot} rounded-full shadow-lg ring-4 ring-slate-950`} />
          </div>
          
          {/* RIGHT SIDE: Empty spacer */}
          <div className="w-1/2" />
        </>
      ) : (
        <>
          {/* LEFT SIDE: Empty spacer */}
          <div className="w-1/2 flex justify-end" />
          
          {/* Dot no centro */}
          <div className="relative z-10 flex flex-shrink-0 items-center justify-center w-12">
            <div className={`w-4 h-4 ${colors.dot} rounded-full shadow-lg ring-4 ring-slate-950`} />
          </div>
          
          {/* RIGHT SIDE: Line + Card */}
          <div className="w-1/2 flex items-center">
            <div className={`h-1 w-12 bg-gradient-to-r ${colors.gradient}`} />
            {cardContent}
          </div>
        </>
      )}
    </div>
  );
}

// === MONTH HEADER ===
function MonthHeader({ month }: { month: string }) {
  return (
    <div className="relative z-10 py-12 flex flex-col items-center">
      <div className="bg-emerald-500/20 backdrop-blur-md border-4 border-emerald-500 p-4 px-12 rounded-lg text-center shadow-xl shadow-emerald-500/10">
        <h2 className="text-3xl font-black text-emerald-500 tracking-widest uppercase">{month}</h2>
      </div>
    </div>
  );
}

// === START LINE COMPONENT ===
const inspirationalPhrases = [
  "Toda jornada começa com um único passo.",
  "Sua determinação é o combustível dessa jornada.",
  "Cada lançamento é uma vitória. Parabéns!",
  "A consistência leva ao sucesso.",
  "Você está no controle de sua jornada.",
  "Pequenos passos, grandes resultados.",
  "Transforme sonhos em realidade, transação por transação.",
];

function StartLine() {
  const phrase = inspirationalPhrases[Math.floor(Math.random() * inspirationalPhrases.length)];
  
  return (
    <div className="relative z-10 py-16 flex flex-col items-center gap-6 mt-12">
      {/* Frase Inspiracional */}
      <div className="text-center mb-4">
        <p className="text-lg font-semibold text-emerald-400 italic max-w-md">
          "{phrase}"
        </p>
      </div>
      
      {/* Faixa de Largada */}
      <div className="relative w-full max-w-2xl">
        {/* Bandeira Quadriculada */}
        <div className="flex items-center justify-center gap-1 mb-4">
          <div className="w-8 h-8 bg-white">
            <div className="w-full h-full grid grid-cols-2 gap-0">
              <div className="bg-black"></div>
              <div className="bg-white border border-black"></div>
              <div className="bg-white border border-black"></div>
              <div className="bg-black"></div>
            </div>
          </div>
          <div className="w-8 h-8 bg-white">
            <div className="w-full h-full grid grid-cols-2 gap-0">
              <div className="bg-black"></div>
              <div className="bg-white border border-black"></div>
              <div className="bg-white border border-black"></div>
              <div className="bg-black"></div>
            </div>
          </div>
          <div className="w-8 h-8 bg-white">
            <div className="w-full h-full grid grid-cols-2 gap-0">
              <div className="bg-black"></div>
              <div className="bg-white border border-black"></div>
              <div className="bg-white border border-black"></div>
              <div className="bg-black"></div>
            </div>
          </div>
        </div>
        
        {/* Linha de Largada */}
        <div className="relative">
          <div className="h-2 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 rounded-full shadow-lg shadow-emerald-500/50"></div>
          <div className="absolute inset-0 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300 opacity-50 blur-md"></div>
        </div>
        
        {/* Texto "INÍCIO DA JORNADA" */}
        <div className="flex justify-center mt-4">
          <div className="px-6 py-2 bg-gradient-to-r from-emerald-500/20 to-emerald-400/20 border border-emerald-500/50 rounded-full">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest">🚩 Início da Jornada</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// === MAIN PAGE ===
export default function TimelineModelPage() {
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL'|'INCOME'|'FUEL'|'MAINTENANCE'|'GOALS'|'EXPENSE'>('ALL');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFilterType, setDateFilterType] = useState<'all'|'day'|'week'|'month'>('all');
  const [dateFilterValue, setDateFilterValue] = useState<string>('');

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // Fetch Vehicles
  const fetchVehicles = useCallback(async () => {
    if (!user) return;
    const { data: vData, error } = await supabase.from('vehicles').select('*').eq('user_id', user.id);
    if (error) {
      console.error("Error fetching vehicles:", error);
      return;
    }
    if (vData && vData.length > 0) {
      // Normalize vehicle fields to match other pages (licensePlate, currentOdometer, model, brand)
      const mappedVehicles = vData.map((v: any) => ({
        ...v,
        id: v.id,
        name: v.name,
        model: v.model || v.name,
        brand: v.brand,
        licensePlate: v.license_plate || v.licensePlate || v.plate,
        currentOdometer: v.current_odometer || v.currentOdometer || v.odometer || 0,
        lastOdometerDate: v.last_odometer_date || v.lastOdometerDate,
      }));

      console.log(`Loaded ${mappedVehicles.length} vehicles`);
      setVehicles(mappedVehicles as any);
      if (!selectedVehicleId) {
        // Try to get last selected vehicle
        const { data: pData } = await supabase.from('profiles').select('last_selected_vehicle_id').eq('id', user.id).single();
        if (pData?.last_selected_vehicle_id) {
          setSelectedVehicleId(pData.last_selected_vehicle_id);
        } else {
          setSelectedVehicleId(mappedVehicles[0].id);
        }
      }
    }
  }, [user, selectedVehicleId]);

  useEffect(() => {
    if (user) {
      fetchVehicles();
    }
  }, [user, fetchVehicles]);

  // Persist selected vehicle in profile and update state
  const handleVehicleChange = async (id: string) => {
    setSelectedVehicleId(id);
    if (!user) return;
    try {
      await supabase.from('profiles').update({ last_selected_vehicle_id: id }).eq('id', user.id);
    } catch (err) {
      console.error('Error saving last_selected_vehicle_id', err);
    }
  };

  // Fetch Timeline Data
  const fetchData = useCallback(async () => {
    if (!selectedVehicleId || !user) return;
    setLoading(true);

    try {
      // Fetch ALL transactions (income + expenses)
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('vehicle_id', selectedVehicleId)
        .order('date', { ascending: false });

      if (transError) {
        console.error("Error fetching transactions:", transError);
      }

      // Fetch goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id);

      if (goalsError) {
        console.error("Error fetching goals:", goalsError);
      }

      let items: TimelineItem[] = [];

      if (transData && transData.length > 0) {
        console.log(`Loaded ${transData.length} transactions for vehicle ${selectedVehicleId}`);
        const tItems: TimelineItem[] = transData.map((t: any) => ({
          id: t.id,
          date: t.date,
          type: 'TRANSACTION',
          data: {
            ...t,
            type: t.type, // INCOME ou EXPENSE
            category: t.category,
            fuelType: t.fuel_type,
            stationName: t.station_name,
            pricePerLiter: t.price_per_liter,
            fullTank: t.is_full_tank,
            liters: t.liters,
            distanceDriven: t.distance || t.distance_driven || 0,
            odometer: t.odometer || 0,
          },
          sortDate: new Date(t.date).getTime()
        }));
        items = [...items, ...tItems];
      } else {
        console.log(`No transactions found for vehicle ${selectedVehicleId}`);
      }

      // Filter goals: only include goals linked to this vehicle or goals without specific vehicle link
      const filteredGoals = goalsData?.filter((g: any) => {
        const linkedVehicles = g.linked_vehicle_ids || [];
        // Include if: goal has no vehicle links (general goal) OR goal is linked to this vehicle
        return linkedVehicles.length === 0 || linkedVehicles.includes(selectedVehicleId);
      }) || [];

      if (filteredGoals && filteredGoals.length > 0) {
        console.log(`Loaded ${filteredGoals.length} goals for vehicle ${selectedVehicleId}`);
        filteredGoals.forEach((g: any) => {
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
      console.error("Timeline error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedVehicleId, user]);

  useEffect(() => {
    if (selectedVehicleId) {
      fetchData();
      const channel = supabase.channel(`realtime-timeline-${selectedVehicleId}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'transactions', filter: `vehicle_id=eq.${selectedVehicleId}` }, 
          () => fetchData()
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'goals' },
          () => fetchData()
        )
        .subscribe();
      return () => { supabase.removeChannel(channel); }
    }
  }, [selectedVehicleId, fetchData]);

  // Helper: check if a date matches the selected date filter
  const isoWeekStart = (year: number, week:number) => {
    const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
    const dow = simple.getUTCDay(); // 0 (Sun) .. 6
    const isoStart = new Date(simple);
    isoStart.setUTCDate(simple.getUTCDate() - ((dow + 6) % 7)); // set to Monday
    return isoStart;
  };

  const matchesDateFilter = (dateString: string) => {
    if (dateFilterType === 'all' || !dateFilterValue) return true;
    const d = new Date(dateString);
    if (dateFilterType === 'day') {
      const target = new Date(dateFilterValue);
      return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth() && d.getDate() === target.getDate();
    }
    if (dateFilterType === 'month') {
      // dateFilterValue is like "2024-01"
      const [y, m] = dateFilterValue.split('-').map(Number);
      return d.getFullYear() === y && (d.getMonth() + 1) === m;
    }
    if (dateFilterType === 'week') {
      // dateFilterValue is like "2024-W05"
      const parts = dateFilterValue.split('-W');
      if (parts.length !== 2) return true;
      const year = Number(parts[0]);
      const week = Number(parts[1]);
      const start = isoWeekStart(year, week);
      const end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 6);
      // compare in UTC to avoid timezone shifts
      const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const s = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
      const e = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
      return dt >= s && dt <= e;
    }
    return true;
  };

  // Filter items according to active filter and date filter, then group by month
  const filteredItems = useMemo(() => {
    if (activeFilter === 'ALL') return timelineItems;
    return timelineItems.filter(item => {
      const t = item.data;
      const isIncome = t?.type === 'INCOME';
      const isFuel = t?.category === ExpenseCategory.FUEL;
      const isMaintenance = t?.category === ExpenseCategory.MAINTENANCE;
      const isGoal = item.type === 'GOAL_CREATED' || item.type === 'GOAL_REACHED';

      switch(activeFilter) {
        case 'INCOME': return isIncome;
        case 'FUEL': return isFuel;
        case 'MAINTENANCE': return isMaintenance;
        case 'GOALS': return isGoal;
        case 'EXPENSE': return t?.type === 'EXPENSE';
        default: return true;
      }
    });
  }, [timelineItems, activeFilter]);

  const dateFilteredItems = useMemo(() => {
    return filteredItems.filter(i => matchesDateFilter(i.date));
  }, [filteredItems, dateFilterType, dateFilterValue]);

  const groupedItems = useMemo(() => {
    return dateFilteredItems.reduce((groups, item) => {
      const key = getMonthYear(item.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {} as Record<string, TimelineItem[]>);
  }, [dateFilteredItems]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 dark:bg-slate-950 text-slate-100 flex-col">
      <Header vehicles={vehicles} selectedVehicleId={selectedVehicleId} onVehicleChange={handleVehicleChange} />
      
      {/* Main Scrollable Content */}
      <style>{`
        .modern-scrollbar::-webkit-scrollbar { width: 10px; }
        .modern-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 9999px; }
        .modern-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(180deg,#16a34a,#059669); border-radius: 9999px; border: 2px solid rgba(15,23,42,0.6); }
        .modern-scrollbar { scrollbar-width: thin; scrollbar-color: #059669 rgba(255,255,255,0.02); }
      `}</style>
      <main className="flex-1 overflow-y-auto modern-scrollbar bg-slate-950 dark:bg-slate-950 relative pb-20">
        {/* Page Heading */}
        <div className="px-8 py-8 flex flex-wrap justify-between items-end gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-4xl font-black leading-tight tracking-tight">Timeline Dashboard</p>
            <p className="text-emerald-500 font-medium flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Live highway view of operational finances
            </p>
          </div>
          <div className="flex gap-3 relative">
            <div className="relative">
              <button onClick={() => setShowDateFilter(s => !s)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800/50 font-bold text-sm border border-slate-700/50 hover:bg-slate-800 transition-all">
                <Calendar className="w-5 h-5" />
                <span>Filtrar Data</span>
              </button>
              {showDateFilter && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl z-50">
                  <div className="flex items-center gap-2 mb-3">
                    <button onClick={() => setDateFilterType('day')} className={`px-3 py-1 rounded ${dateFilterType === 'day' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'}`}>Dia</button>
                    <button onClick={() => setDateFilterType('week')} className={`px-3 py-1 rounded ${dateFilterType === 'week' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'}`}>Semana</button>
                    <button onClick={() => setDateFilterType('month')} className={`px-3 py-1 rounded ${dateFilterType === 'month' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'}`}>Mês</button>
                    <button onClick={() => { setDateFilterType('all'); setDateFilterValue(''); }} className="ml-auto text-xs text-slate-400">Limpar</button>
                  </div>
                  <div>
                    {dateFilterType === 'day' && (
                      <input value={dateFilterValue} onChange={(e) => setDateFilterValue(e.target.value)} type="date" className="w-full bg-slate-800 px-3 py-2 rounded text-sm" />
                    )}
                    {dateFilterType === 'week' && (
                      <input value={dateFilterValue} onChange={(e) => setDateFilterValue(e.target.value)} type="week" className="w-full bg-slate-800 px-3 py-2 rounded text-sm" />
                    )}
                    {dateFilterType === 'month' && (
                      <input value={dateFilterValue} onChange={(e) => setDateFilterValue(e.target.value)} type="month" className="w-full bg-slate-800 px-3 py-2 rounded text-sm" />
                    )}
                    {dateFilterType === 'all' && (
                      <p className="text-xs text-slate-400 mt-1">Selecione Dia, Semana ou Mês</p>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <button onClick={() => { setDateFilterType('all'); setDateFilterValue(''); setShowDateFilter(false); }} className="px-3 py-1 rounded bg-slate-800 text-sm">Cancelar</button>
                    <button onClick={() => setShowDateFilter(false)} className="px-3 py-1 rounded bg-emerald-600 text-sm text-white">Aplicar</button>
                  </div>
                </div>
              )}
            </div>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20">
              <Share2 className="w-5 h-5" />
              <span>Exportar Relatório</span>
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="px-8 flex gap-3 overflow-x-auto pb-6">
          <button onClick={() => setActiveFilter('ALL')} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border ${activeFilter === 'ALL' ? 'bg-emerald-500 text-white border-emerald-500/20' : 'bg-slate-800/50 text-slate-400 border-slate-700/50'}`}>
            <span>Todas as Atividades</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          <button onClick={() => setActiveFilter('INCOME')} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border ${activeFilter === 'INCOME' ? 'bg-emerald-500 text-white border-emerald-500/20' : 'bg-slate-800/50 text-slate-400 border-slate-700/50'}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Receitas</span>
          </button>
          <button onClick={() => setActiveFilter('FUEL')} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border ${activeFilter === 'FUEL' ? 'bg-yellow-500 text-black border-yellow-400/20' : 'bg-slate-800/50 text-slate-400 border-slate-700/50'}`}>
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>Abastecimentos</span>
          </button>
          <button onClick={() => setActiveFilter('MAINTENANCE')} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border ${activeFilter === 'MAINTENANCE' ? 'bg-red-500 text-white border-red-400/20' : 'bg-slate-800/50 text-slate-400 border-slate-700/50'}`}>
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>Manutenção</span>
          </button>
          <button onClick={() => setActiveFilter('GOALS')} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border ${activeFilter === 'GOALS' ? 'bg-indigo-600 text-white border-indigo-500/20' : 'bg-slate-800/50 text-slate-400 border-slate-700/50'}`}>
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <span>Metas</span>
          </button>
        </div>

        {/* Timeline Highway */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-slate-400">Carregando eventos...</p>
          </div>
        ) : timelineItems.length === 0 ? (
          <div className="flex items-center justify-center min-h-[500px] flex-col gap-4">
            <div className="p-6 bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 rounded-2xl border border-emerald-500/30">
              <Rocket className="w-16 h-16 text-emerald-500 mx-auto" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Comece sua Jornada</h3>
              <p className="text-slate-400 max-w-sm">
                Nenhum evento registrado ainda. Registre sua primeira receita, despesa ou abastecimento para começar a acompanhar sua jornada!
              </p>
            </div>
          </div>
        ) : (
          <div className="relative w-full flex flex-col items-center min-h-screen">
            {/* The Highway (Central Axis) */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-24 bg-slate-900/50 dark:bg-slate-900 border-x-4 border-slate-800 flex justify-center">
              <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-slate-500 to-transparent" />
              <div className="absolute inset-y-0 left-2 w-[2px] border-l border-slate-700" />
              <div className="absolute inset-y-0 right-2 w-[2px] border-r border-slate-700" />
            </div>

            {/* Timeline Items */}
            <div className="relative w-full max-w-6xl px-4 flex flex-col gap-32 pt-12 pb-12 min-h-full">
              {Object.entries(groupedItems).map(([month, items], monthIdx) => (
                <div key={month} className="relative">
                  {/* Placa do Mês */}
                  <MonthHeader month={month.toUpperCase()} />
                  
                  {/* Lançamentos do Mês */}
                  <div className="flex flex-col gap-24 mt-12">
                    {items.map((item, idx) => {
                      const t = item.data;
                      const isIncome = t?.type === 'INCOME';
                      const isFuel = t?.category === ExpenseCategory.FUEL;
                      const isMaintenance = t?.category === ExpenseCategory.MAINTENANCE;
                      const isGoal = item.type === 'GOAL_CREATED' || item.type === 'GOAL_REACHED';

                    if (isGoal) {
                      const g = t;
                      const goalType = item.type === 'GOAL_CREATED' ? 'Criada' : 'Conquistada!';
                      return (
                        <TimelineTransaction
                          key={item.id}
                          position={idx % 2 === 0 ? 'right' : 'left'}
                          type="income"
                          icon={<Zap className="w-4 h-4" />}
                          title={`Meta ${goalType}`}
                          time={formatTime(item.date)}
                          description={g?.title || 'Meta'}
                          amount={formatCurrencyCents(g?.amount || 0)}
                          subtitle={`Status: ${g?.status || 'Ativa'}`}
                        />
                      );
                    }

                    if (isIncome) {
                      const isMultiplePlatforms = t?.platform === 'MULTIPLE' || (t?.split && Array.isArray(t.split) && t.split.length > 1);
                      return (
                        <TimelineTransaction
                          key={item.id}
                          position={idx % 2 === 0 ? 'right' : 'left'}
                          type="income"
                          icon={<TrendingUp className="w-4 h-4" />}
                          title="Receita"
                          time={formatDateWithTime(item.date)}
                          description={t?.description || 'Receita Recebida'}
                          amount={formatCurrencyCents(t?.amount || 0)}
                          platformConfig={getAppIcon(t?.platform || 'PARTICULAR', isMultiplePlatforms)}
                          tripDistance={Math.round(t?.distanceDriven || t?.distance || 0)}
                          odometer={t?.odometer || 0}
                        />
                      );
                    }

                    if (isFuel) {
                      return (
                        <TimelineTransaction
                          key={item.id}
                          position={idx % 2 === 0 ? 'right' : 'left'}
                          type="fuel"
                          icon={<Fuel className="w-4 h-4" />}
                          title="Abastecimento"
                          time={formatDateWithTime(item.date)}
                          description={t?.stationName || 'Abastecimento'}
                          amount={formatCurrencyCents(t?.amount || 0)}
                          fuelType={t?.fuelType || 'Gasolina'}
                          fuelVolume={t?.liters || 0}
                          location={t?.stationName || undefined}
                          pricePerLiter={t?.pricePerLiter || undefined}
                        />
                      );
                    }

                    if (isMaintenance) {
                      return (
                        <TimelineTransaction
                          key={item.id}
                          position={idx % 2 === 0 ? 'right' : 'left'}
                          type="maintenance"
                          icon={<Wrench className="w-4 h-4" />}
                          title="Manutenção"
                          time={formatTime(item.date)}
                          description={t?.description || 'Manutenção do Veículo'}
                          amount={formatCurrencyCents(t?.amount || 0)}
                        />
                      );
                    }

                    return (
                      <TimelineTransaction
                        key={item.id}
                        position={idx % 2 === 0 ? 'right' : 'left'}
                        type="expense"
                        icon={<AlertCircle className="w-4 h-4" />}
                        title="Despesa"
                        time={formatTime(item.date)}
                        description={t?.description || 'Despesa'}
                        amount={formatCurrencyCents(t?.amount || 0)}
                      />
                    );
                  })}
                  </div>
                </div>
              ))}
              
              {/* Start Line with Inspirational Message */}
              <StartLine />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
