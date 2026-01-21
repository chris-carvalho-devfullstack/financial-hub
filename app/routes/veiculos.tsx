import { useEffect, useState } from "react";
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { Trash2, Plus, Car } from "lucide-react";
import { db, auth } from "~/lib/firebase.client";
import { FuelType } from "~/types/enums";
import type { Vehicle } from "~/types/models";

export default function VeiculosPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // Estado para o botão salvar
  
  // Estados do Formulário
  const [model, setModel] = useState("");
  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [odometer, setOdometer] = useState("");
  const [fuel, setFuel] = useState<FuelType>(FuelType.FLEX); // Padrão agora é Flex

  // Monitorar Auth e Buscar veículos
  useEffect(() => {
    // Pequeno delay para garantir que o Firebase Auth inicializou
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(
          collection(db, "vehicles"),
          where("userId", "==", user.uid)
        );

        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const veiculosData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Vehicle[];
          setVehicles(veiculosData);
          setLoadingList(false);
        }, (error) => {
          console.error("Erro ao buscar veículos:", error);
          setLoadingList(false);
        });
        
        return () => unsubscribeSnapshot();
      } else {
        setLoadingList(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Tentando salvar..."); // Debug

    if (!auth.currentUser) {
      alert("Erro: Usuário não está logado. Recarregue a página.");
      return;
    }

    setIsSaving(true);

    try {
      const vehicleData = {
        userId: auth.currentUser.uid,
        name: name || model,
        model,
        year: Number(year),
        primaryFuel: fuel,
        currentOdometer: Number(odometer),
        createdAt: new Date().toISOString()
      };

      console.log("Dados a enviar:", vehicleData); // Debug

      await addDoc(collection(db, "vehicles"), vehicleData);
      
      // Limpar form
      setModel("");
      setName("");
      setOdometer("");
      setIsSaving(false);
      alert("Veículo cadastrado com sucesso!");
    } catch (error: any) {
      console.error("Erro detalhado ao salvar:", error); // Debug vital
      
      // Tratamento de erro comum de permissão
      if (error.code === 'permission-denied') {
        alert("Erro de Permissão: Verifique as Regras do Firestore no Console do Firebase.");
      } else {
        alert("Erro ao salvar: " + error.message);
      }
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este veículo?")) {
      try {
        await deleteDoc(doc(db, "vehicles", id));
      } catch (error) {
        alert("Erro ao excluir.");
      }
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Meus Veículos</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* === FORMULÁRIO DE CADASTRO === */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 sticky top-4">
            <h2 className="text-xl font-semibold text-emerald-500 mb-4 flex items-center gap-2">
              <Plus size={20} /> Novo Veículo
            </h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Modelo (Ex: Onix 1.0)</label>
                <input 
                  required 
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white placeholder-gray-600" 
                  placeholder="Modelo do carro"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Apelido (Opcional)</label>
                <input 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white placeholder-gray-600" 
                  placeholder="Ex: Carro de Trabalho"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Ano</label>
                  <input 
                    type="number"
                    required 
                    value={year}
                    onChange={e => setYear(Number(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Combustível</label>
                  <select 
                    value={fuel}
                    onChange={e => setFuel(e.target.value as FuelType)}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                  >
                    <option value={FuelType.FLEX}>Flex (Gas/Eta)</option>
                    <option value={FuelType.GASOLINE}>Gasolina</option>
                    <option value={FuelType.ETHANOL}>Etanol</option>
                    <option value={FuelType.CNG}>GNV</option>
                    <option value={FuelType.DIESEL}>Diesel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-emerald-400 font-medium mb-1">KM Atual (Odômetro)</label>
                <input 
                  type="number"
                  required 
                  value={odometer}
                  onChange={e => setOdometer(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white font-mono placeholder-gray-600" 
                  placeholder="00000"
                />
                <p className="text-xs text-gray-500 mt-1">Essencial para calcular o consumo.</p>
              </div>

              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold py-3 rounded-lg mt-4 transition-colors"
              >
                {isSaving ? "Salvando..." : "Cadastrar Carro"}
              </button>
            </form>
          </div>
        </div>

        {/* === LISTA DE VEÍCULOS === */}
        <div className="lg:col-span-2">
          {loadingList ? (
            <p className="text-gray-500 animate-pulse">Carregando garagem...</p>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-10 bg-gray-900/50 rounded-xl border border-gray-800 border-dashed">
              <Car className="mx-auto h-12 w-12 text-gray-600 mb-3" />
              <h3 className="text-lg font-medium text-gray-400">Nenhum veículo cadastrado</h3>
              <p className="text-gray-500 text-sm">Cadastre seu carro ao lado para começar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehicles.map((car) => (
                <div key={car.id} className="bg-gray-900 p-5 rounded-xl border border-gray-800 flex flex-col justify-between hover:border-emerald-500/30 transition-colors">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-white">{car.name}</h3>
                      <span className="bg-gray-800 text-xs px-2 py-1 rounded text-gray-300">{car.year}</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">{car.model}</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Odômetro:</span>
                        <span className="font-mono text-emerald-400">{car.currentOdometer} km</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Combustível:</span>
                        <span className="text-white">
                           {car.primaryFuel === 'FLEX' ? 'Flex (G/E)' : car.primaryFuel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-800 flex justify-end">
                    <button 
                      onClick={() => handleDelete(car.id)}
                      className="text-red-500 hover:text-red-400 text-sm flex items-center gap-1 transition-colors hover:bg-red-500/10 px-2 py-1 rounded"
                    >
                      <Trash2 size={16} /> Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}