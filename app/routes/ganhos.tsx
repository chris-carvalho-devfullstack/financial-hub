import { useEffect, useState } from "react";
import { collection, addDoc, deleteDoc, doc, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { 
  Car, Clock, Map, DollarSign, Briefcase, 
  History, CheckCircle2, Zap, 
  LayoutGrid, ChevronUp, Trash2, Gauge 
} from "lucide-react";
import { db, auth } from "~/lib/firebase.client";
import { Platform } from "~/types/enums";
import type { Vehicle, IncomeTransaction } from "~/types/models";

// === CONFIGURAÇÃO DAS PLATAFORMAS (IMAGENS LOCAIS) ===
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

export default function GanhosPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [recentGains, setRecentGains] = useState<IncomeTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);

  // Estados do Formulário
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(Platform.UBER);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Métricas
  const [distance, setDistance] = useState("");
  const [hours, setHours] = useState("");
  const [trips, setTrips] = useState("");
  const [clusterAvg, setClusterAvg] = useState(""); // <--- NOVO: Média do Painel

  const displayedPlatforms = showAllPlatforms ? ALL_PLATFORMS : ALL_PLATFORMS.slice(0, 3);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        const qVehicles = query(collection(db, "vehicles"), where("userId", "==", user.uid));
        onSnapshot(qVehicles, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Vehicle[];
          setVehicles(data);
          if (data.length > 0 && !selectedVehicle) setSelectedVehicle(data[0].id);
        });

        const qGains = query(
          collection(db, "transactions"), 
          where("userId", "==", user.uid),
          where("type", "==", "INCOME"),
          orderBy("date", "desc"),
          limit(10)
        );
        onSnapshot(qGains, (snap) => {
          setRecentGains(snap.docs.map(d => ({ id: d.id, ...d.data() })) as IncomeTransaction[]);
          setLoading(false);
        });
      }
    });
    return () => unsub && unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !selectedVehicle) return;
    setSaving(true);

    try {
      const amountCents = Math.round(parseFloat(amount.replace(',', '.')) * 100);
      const hoursNum = parseFloat(hours.replace(',', '.')) || 0;
      const avgNum = parseFloat(clusterAvg.replace(',', '.')) || 0;
      
      await addDoc(collection(db, "transactions"), {
        userId: auth.currentUser.uid,
        vehicleId: selectedVehicle,
        type: 'INCOME',
        platform: selectedPlatform,
        amount: amountCents,
        date: new Date(date).toISOString(),
        distanceDriven: Number(distance) || 0,
        onlineDurationMinutes: Math.round(hoursNum * 60),
        tripsCount: Number(trips) || 0,
        clusterKmPerLiter: avgNum, // <--- SALVANDO
        createdAt: new Date().toISOString()
      });

      setAmount("");
      setDistance("");
      setHours("");
      setTrips("");
      setClusterAvg(""); // Reset
      setSaving(false);
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar.");
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apagar registro?")) return;
    setDeletingId(id);
    try { await deleteDoc(doc(db, "transactions", id)); } catch (e) { console.error(e); } finally { setDeletingId(null); }
  };

  const formatMoney = (val: number) => (val / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const getPlatformDetails = (id: string) => ALL_PLATFORMS.find(p => p.id === id) || ALL_PLATFORMS[5];

  return (
    <div className="pb-32 pt-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="flex-1 w-full md:max-w-2xl">
          
          <header className="mb-6 md:h-[88px] flex flex-col justify-center">
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
              <Zap className="text-yellow-500 fill-yellow-500" size={28} /> Registrar Ganho
            </h1>
            <p className="text-gray-400 text-sm md:text-base">Selecione o app e lance o faturamento.</p>
          </header>

          <form onSubmit={handleSave} className="space-y-6 md:space-y-8">
             
             {/* SELEÇÃO DE VEÍCULO */}
             <div className="bg-gray-900/50 p-3 md:p-4 rounded-xl border border-gray-800 active:border-emerald-500/50 transition-colors">
               <label className="text-gray-400 text-xs font-bold uppercase mb-2 block tracking-wider">Veículo</label>
               <div className="relative">
                  <Car className="absolute left-3 top-3.5 text-gray-500" size={18} />
                  <select 
                    value={selectedVehicle}
                    onChange={e => setSelectedVehicle(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none font-medium h-12"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
               </div>
            </div>

            {/* PLATAFORMA */}
            <div>
               <label className="text-gray-400 text-xs font-bold uppercase mb-3 block tracking-wider">Plataforma</label>
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {displayedPlatforms.map((p) => {
                     const isSelected = selectedPlatform === p.id;
                     return (
                       <button
                         key={p.id}
                         type="button"
                         onClick={() => setSelectedPlatform(p.id as Platform)}
                         className={`relative h-28 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center gap-2 group overflow-hidden active:scale-95 ${isSelected ? `${p.bg} ${p.textColor} border-transparent shadow-lg ring-2 ring-white/30` : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'}`}
                       >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden ${!p.logo ? 'bg-white/10' : 'bg-white'} ${isSelected ? 'shadow-lg scale-110' : 'opacity-90 group-hover:scale-110 transition-transform'}`}>
                            {p.logo ? <img src={p.logo} alt={p.label} className="w-full h-full object-cover" /> : p.icon}
                          </div>
                          <span className="font-bold text-sm tracking-tight">{p.label}</span>
                          {isSelected && <CheckCircle2 size={18} className="absolute top-2 right-2 text-white drop-shadow-md" />}
                       </button>
                     )
                  })}
                  {!showAllPlatforms && (
                    <button type="button" onClick={() => setShowAllPlatforms(true)} className="h-28 rounded-2xl border border-gray-800 bg-gray-900/50 hover:bg-gray-800 text-gray-400 hover:text-white transition-all flex flex-col items-center justify-center gap-2 group active:scale-95">
                      <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center group-hover:bg-gray-700"><LayoutGrid size={20} /></div>
                      <span className="font-bold text-sm">Ver Mais</span>
                    </button>
                  )}
                  {showAllPlatforms && (
                    <button type="button" onClick={() => setShowAllPlatforms(false)} className="h-28 rounded-2xl border border-dashed border-gray-700 bg-transparent text-gray-500 hover:text-white hover:border-gray-500 transition-all flex flex-col items-center justify-center gap-1 active:scale-95">
                      <ChevronUp size={24} /><span className="text-xs font-medium">Recolher</span>
                    </button>
                  )}
               </div>
            </div>

            {/* DADOS FINANCEIROS */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-6 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="col-span-1 md:col-span-2">
                      <label className="text-emerald-400 text-xs font-bold uppercase mb-2 block tracking-wider">Valor Total (R$)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-xl md:text-2xl">R$</span>
                        <input type="number" step="0.01" required inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-gray-950 border border-emerald-500/30 rounded-xl py-4 pl-12 md:pl-14 text-white text-2xl md:text-3xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none placeholder-emerald-900/30 h-16 md:h-20" placeholder="0,00" />
                      </div>
                  </div>
                  <div>
                      <label className="text-gray-500 text-xs font-bold uppercase mb-2 block tracking-wider">Data</label>
                      <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 md:p-4 text-white focus:border-emerald-500 outline-none h-12 md:h-14"/>
                  </div>
               </div>
            </div>

            {/* MÉTRICAS (GRID COM 4 COLUNAS AGORA) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                
                {/* 1. KM RODADOS */}
                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 flex flex-col justify-center">
                   <label className="text-gray-500 text-[9px] md:text-[10px] font-bold uppercase mb-1 block">KM Rodados</label>
                   <div className="flex items-center gap-1.5">
                      <Map size={14} className="text-blue-500 shrink-0" />
                      <input type="number" inputMode="numeric" value={distance} onChange={e => setDistance(e.target.value)} className="w-full bg-transparent text-white font-bold outline-none border-b border-gray-700 focus:border-blue-500 pb-0.5 text-sm md:text-base" placeholder="0" />
                   </div>
                </div>

                {/* 2. MÉDIA PAINEL (NOVO) */}
                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 flex flex-col justify-center">
                   <label className="text-gray-500 text-[9px] md:text-[10px] font-bold uppercase mb-1 block">Média Painel</label>
                   <div className="flex items-center gap-1.5">
                      <Gauge size={14} className="text-orange-500 shrink-0" />
                      <input 
                        type="number" step="0.1" inputMode="decimal"
                        value={clusterAvg} onChange={e => setClusterAvg(e.target.value)} 
                        className="w-full bg-transparent text-white font-bold outline-none border-b border-gray-700 focus:border-orange-500 pb-0.5 text-sm md:text-base" 
                        placeholder="km/l" 
                      />
                   </div>
                </div>

                {/* 3. HORAS */}
                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 flex flex-col justify-center">
                   <label className="text-gray-500 text-[9px] md:text-[10px] font-bold uppercase mb-1 block">Horas</label>
                   <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-yellow-500 shrink-0" />
                      <input type="number" step="0.1" inputMode="decimal" value={hours} onChange={e => setHours(e.target.value)} className="w-full bg-transparent text-white font-bold outline-none border-b border-gray-700 focus:border-yellow-500 pb-0.5 text-sm md:text-base" placeholder="0.0" />
                   </div>
                </div>

                {/* 4. VIAGENS */}
                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 flex flex-col justify-center">
                   <label className="text-gray-500 text-[9px] md:text-[10px] font-bold uppercase mb-1 block">Viagens</label>
                   <div className="flex items-center gap-1.5">
                      <Briefcase size={14} className="text-purple-500 shrink-0" />
                      <input type="number" inputMode="numeric" value={trips} onChange={e => setTrips(e.target.value)} className="w-full bg-transparent text-white font-bold outline-none border-b border-gray-700 focus:border-purple-500 pb-0.5 text-sm md:text-base" placeholder="0" />
                   </div>
                </div>
            </div>

            <button type="submit" disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 text-base md:text-lg h-14 md:h-16">
              {saving ? "Salvando..." : <><DollarSign size={20} /> Confirmar Lançamento</>}
            </button>
          </form>
        </div>

        {/* COLUNA DIREITA: HISTÓRICO (Mantida, com adição da info de média) */}
        <div className="flex-1 w-full md:border-l md:border-gray-800 md:pl-8">
           <div className="mt-8 md:mt-[112px]">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-gray-400 font-bold uppercase text-sm flex items-center gap-2"><History size={16} /> Histórico Recente</h3>
                 {recentGains.length > 0 && <span className="text-[10px] text-gray-500 bg-gray-900 px-2 py-1 rounded border border-gray-800 font-mono">{recentGains.length} últimos</span>}
              </div>

              {!loading && recentGains.map(gain => {
                  const platformInfo = getPlatformDetails(gain.platform);
                  const isDeleting = deletingId === gain.id;
                  return (
                    <div key={gain.id} className="group relative bg-gray-900 border border-gray-800 hover:border-gray-600 p-3 rounded-xl transition-all flex items-center justify-between overflow-hidden mb-3 active:bg-gray-800">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 min-w-[2.5rem] rounded-xl bg-white flex items-center justify-center shadow-sm overflow-hidden">
                            {platformInfo.logo ? <img src={platformInfo.logo} alt={platformInfo.label} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-blue-600 flex items-center justify-center">{platformInfo.icon}</div>}
                          </div>
                          <div>
                             <p className="font-bold text-white text-sm leading-tight">{platformInfo.label}</p>
                             <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <span>{new Date(gain.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                {gain.clusterKmPerLiter && gain.clusterKmPerLiter > 0 && (
                                   <span className="flex items-center gap-0.5 border-l border-gray-700 pl-2 text-orange-400 font-mono">
                                      <Gauge size={10}/> {gain.clusterKmPerLiter} km/l
                                   </span>
                                )}
                             </div>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <span className="text-emerald-400 font-bold text-sm md:text-base">{formatMoney(gain.amount)}</span>
                          <button onClick={() => handleDelete(gain.id)} disabled={isDeleting} className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                       </div>
                    </div>
                  );
               })}
           </div>
        </div>
      </div>
    </div>
  );
}