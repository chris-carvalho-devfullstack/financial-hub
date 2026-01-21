import { useEffect, useState } from "react";
import { collection, addDoc, query, where, orderBy, limit, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { TrendingUp, Calendar, MapPin, Trash2, AlertCircle } from "lucide-react";
import { db, auth } from "~/lib/firebase.client";
import { Platform } from "~/types/enums";
import type { IncomeTransaction, Vehicle } from "~/types/models";

export default function GanhosPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [recentIncomes, setRecentIncomes] = useState<IncomeTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados do Formulário
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [platform, setPlatform] = useState<Platform>(Platform.UBER);
  const [amount, setAmount] = useState(""); // String para facilitar digitação
  const [distance, setDistance] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Carregar Veículos e Histórico Recente
  useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;

    // 1. Buscar Veículos
    const qVehicles = query(collection(db, "vehicles"), where("userId", "==", userId));
    const unsubscribeVehicles = onSnapshot(qVehicles, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Vehicle[];
      setVehicles(data);
      if (data.length > 0 && !selectedVehicle) setSelectedVehicle(data[0].id);
    });

    // 2. Buscar Últimos 5 Ganhos
    const qIncomes = query(
      collection(db, "transactions"), 
      where("userId", "==", userId),
      where("type", "==", "INCOME"),
      orderBy("date", "desc"), // Ordenar por data
      limit(5)
    );

    // Nota: Se der erro de "Index", o Firebase vai mandar um link no console para criar o índice.
    const unsubscribeIncomes = onSnapshot(qIncomes, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as IncomeTransaction[];
      setRecentIncomes(data);
      setLoading(false);
    }, (err) => console.error("Erro ao buscar ganhos:", err));

    return () => {
      unsubscribeVehicles();
      unsubscribeIncomes();
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !selectedVehicle) return;

    setSaving(true);
    try {
      const amountInCents = Math.round(parseFloat(amount.replace(',', '.')) * 100);

      await addDoc(collection(db, "transactions"), {
        userId: auth.currentUser.uid,
        vehicleId: selectedVehicle,
        type: 'INCOME',
        platform,
        amount: amountInCents, // Salvando em centavos
        distanceDriven: Number(distance),
        date: new Date(date).toISOString(),
        createdAt: new Date().toISOString()
      });

      // Resetar form parcial
      setAmount("");
      setDistance("");
      setSaving(false);
      // alert("Ganho registrado!"); // Opcional, como a lista atualiza sozinha, as vezes não precisa
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar ganho.");
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Apagar este registro?")) {
      await deleteDoc(doc(db, "transactions", id));
    }
  };

  // Helper para formatar moeda
  const formatMoney = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Lista de Plataformas para os botões
  const platforms = [
    { id: Platform.UBER, label: 'Uber', color: 'hover:bg-black hover:text-white' },
    { id: Platform.NINETY_NINE, label: '99', color: 'hover:bg-yellow-400 hover:text-black' },
    { id: Platform.IFOOD, label: 'iFood', color: 'hover:bg-red-600 hover:text-white' },
    { id: Platform.INDRIVER, label: 'inDrive', color: 'hover:bg-green-600 hover:text-white' },
    { id: Platform.PARTICULAR, label: 'Particular', color: 'hover:bg-blue-600 hover:text-white' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Registrar Ganhos</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === FORMULÁRIO === */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 sticky top-4">
            
            {vehicles.length === 0 ? (
              <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="mx-auto text-red-500 mb-2" />
                <p className="text-sm text-red-400">Você precisa cadastrar um veículo antes.</p>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-5">
                
                {/* Seleção de Veículo */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Veículo</label>
                  <select 
                    value={selectedVehicle}
                    onChange={e => setSelectedVehicle(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.model})</option>
                    ))}
                  </select>
                </div>

                {/* Seleção de Plataforma (Botões Visuais) */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Plataforma</label>
                  <div className="grid grid-cols-3 gap-2">
                    {platforms.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPlatform(p.id)}
                        className={`text-xs font-medium py-2 rounded border transition-all ${
                          platform === p.id 
                            ? "bg-emerald-600 border-emerald-500 text-white" 
                            : "bg-gray-800 border-gray-700 text-gray-400 " + p.color
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-emerald-400 font-bold mb-1">Valor (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">KM Rodado</label>
                    <input 
                      type="number"
                      required
                      value={distance}
                      onChange={e => setDistance(e.target.value)}
                      placeholder="KM"
                      className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Data</label>
                  <input 
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-emerald-500/20 transition-all"
                >
                  {saving ? "Salvando..." : "Confirmar Ganho"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* === HISTÓRICO RECENTE === */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500" /> Últimos Lançamentos
          </h2>

          {loading ? (
            <p className="text-gray-500">Carregando histórico...</p>
          ) : recentIncomes.length === 0 ? (
            <div className="p-8 border border-dashed border-gray-800 rounded-xl text-center">
              <p className="text-gray-500">Nenhum ganho registrado recentemente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentIncomes.map((inc) => (
                <div key={inc.id} className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex justify-between items-center hover:border-emerald-500/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xs">
                      {inc.platform.substring(0, 3)}
                    </div>
                    <div>
                      <p className="font-bold text-white">{formatMoney(inc.amount)}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(inc.date).toLocaleDateString('pt-BR')}</span>
                        <span className="flex items-center gap-1"><MapPin size={12}/> {inc.distanceDriven} km</span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleDelete(inc.id)}
                    className="text-gray-600 hover:text-red-500 transition-colors p-2"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}