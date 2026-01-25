// app/routes/veiculos.tsx

import { useEffect, useState } from "react";
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { 
    Car, Plus, Trash2, Gauge, Calendar, AlertTriangle, 
    Pencil, Save, X, Hash, Bike, Truck, Info, CheckCircle2
} from "lucide-react";
import { db, auth } from "~/lib/firebase.client";
import { VehicleType } from "~/types/enums";
import type { Vehicle } from "~/types/models";

// === UTILITÁRIOS ===
const getVehicleIcon = (type?: VehicleType, size = 24, className = "") => {
    switch (type) {
        case VehicleType.MOTORCYCLE: return <Bike size={size} className={className} />;
        case VehicleType.TRUCK: return <Truck size={size} className={className} />;
        case VehicleType.PICKUP: return <Truck size={size} className={className} />; 
        case VehicleType.CAR:
        default: return <Car size={size} className={className} />;
    }
};

const getVehicleLabel = (type?: VehicleType) => {
    switch (type) {
        case VehicleType.MOTORCYCLE: return "Moto";
        case VehicleType.TRUCK: return "Caminhão";
        case VehicleType.PICKUP: return "Caminhonete";
        case VehicleType.CAR:
        default: return "Carro";
    }
};

// === MODAL DE CONFIRMAÇÃO DE EXCLUSÃO ===
function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-default">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className="bg-red-500/10 p-3 rounded-full">
            <AlertTriangle className="text-red-500" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-gray-400 text-sm mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg font-medium transition-colors cursor-pointer">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg font-medium transition-colors cursor-pointer">Sim, excluir</button>
        </div>
      </div>
    </div>
  );
}

// === MODAL DE VISUALIZAÇÃO (DETALHES PREMIUM) ===
function VehicleDetailsModal({ isOpen, onClose, vehicle, onEdit, onDelete }: any) {
    if (!isOpen || !vehicle) return null;

    const Icon = getVehicleIcon(vehicle.type, 40, "text-white");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-default">
            <div className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 fade-in duration-300">
                
                {/* Header Moderno */}
                <div className="relative bg-gradient-to-r from-blue-900/40 to-gray-900 p-6 flex items-center gap-5 border-b border-gray-800">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors cursor-pointer z-10">
                        <X size={20} />
                    </button>

                    <div className="h-20 w-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20 transform -rotate-3 border border-blue-500/30">
                        {Icon}
                    </div>
                    
                    <div>
                        <h2 className="text-2xl font-bold text-white leading-none mb-1">{vehicle.name}</h2>
                        <span className="text-blue-200 text-sm font-medium flex items-center gap-1.5 opacity-80">
                           <Info size={14}/> Detalhes da Frota
                        </span>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto bg-gray-950/30">
                    
                    {/* PLACA E ANO (Destaques Visuais) */}
                    <div className="flex gap-4">
                        {/* Placa Mercosul Estilizada */}
                        <div className="flex-1 bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg relative min-h-[60px] flex flex-col items-center group hover:scale-[1.02] transition-transform duration-300">
                            <div className="w-full h-6 bg-[#003399] flex items-center justify-between px-3 relative">
                                <span className="text-[8px] font-bold text-white tracking-widest">BRASIL</span>
                                <div className="absolute right-2 top-1 w-4 h-3 bg-blue-400/30 rounded-sm"></div> {/* Fake flag */}
                            </div>
                            <div className="flex-1 flex items-center justify-center py-1">
                                <span className="text-black font-mono font-bold text-3xl tracking-widest uppercase transform scale-x-110">
                                    {vehicle.licensePlate || "SEM-PLACA"}
                                </span>
                            </div>
                        </div>
                        
                        <div className="w-1/3 bg-gray-800 border border-gray-700 rounded-xl flex flex-col items-center justify-center p-2 shadow-inner">
                            <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">Ano/Modelo</span>
                            <span className="text-xl text-white font-bold flex items-center gap-1">
                                <Calendar size={16} className="text-blue-500"/>
                                {vehicle.year || "----"}
                            </span>
                        </div>
                    </div>

                    {/* GRID DE INFORMAÇÕES */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700/50 flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">Marca</span>
                            <span className="text-base text-gray-200 font-semibold truncate" title={vehicle.brand}>{vehicle.brand || "---"}</span>
                        </div>
                        <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700/50 flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">Modelo</span>
                            <span className="text-base text-gray-200 font-semibold truncate" title={vehicle.model}>{vehicle.model || "---"}</span>
                        </div>
                        <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700/50 flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">Tipo</span>
                            <span className="text-base text-gray-200 font-semibold">{getVehicleLabel(vehicle.type)}</span>
                        </div>
                        <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700/50 flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">Cadastro</span>
                            <span className="text-xs text-gray-300 font-mono mt-1">
                                {vehicle.createdAt ? new Date(vehicle.createdAt).toLocaleDateString('pt-BR') : '---'}
                            </span>
                        </div>
                    </div>

                    {/* ODÔMETRO (Painel Digital) */}
                    <div className="relative overflow-hidden rounded-2xl bg-black border border-gray-800 p-5 shadow-2xl ring-1 ring-white/5">
                         {/* Background Glow */}
                         <div className="absolute top-0 right-0 p-3 opacity-20 blur-xl">
                             <Gauge size={100} className="text-emerald-500" />
                         </div>
                         
                         <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></div>
                                    Painel do Veículo
                                </span>
                                {vehicle.updatedAt && (
                                    <span className="text-[9px] text-gray-600 font-mono">
                                        Ref: {new Date(vehicle.updatedAt).toLocaleDateString('pt-BR')}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-mono font-bold text-white tracking-tighter drop-shadow-lg">
                                    {(vehicle.currentOdometer || 0).toLocaleString('pt-BR')}
                                </span>
                                <span className="text-xl text-gray-500 font-sans font-medium">km</span>
                            </div>
                         </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-gray-900 border-t border-gray-800 flex gap-3">
                    <button 
                        onClick={() => { onClose(); onEdit(vehicle); }}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20 cursor-pointer"
                    >
                        <Pencil size={18} /> Editar Dados
                    </button>
                    <button 
                        onClick={() => { onClose(); onDelete(vehicle.id); }}
                        className="flex-none w-14 flex items-center justify-center rounded-xl bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95 cursor-pointer border border-gray-700 hover:border-red-500/50"
                        title="Excluir Veículo"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// === MODAL DE FORMULÁRIO (CRIAR / EDITAR) ===
function VehicleFormModal({ isOpen, onClose, onSave, vehicleToEdit }: any) {
    const [name, setName] = useState("");
    const [type, setType] = useState<VehicleType>(VehicleType.CAR);
    const [brand, setBrand] = useState("");
    const [model, setModel] = useState("");
    const [year, setYear] = useState("");
    const [plate, setPlate] = useState("");
    const [odometer, setOdometer] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (vehicleToEdit) {
            setName(vehicleToEdit.name || "");
            setType(vehicleToEdit.type || VehicleType.CAR);
            setBrand(vehicleToEdit.brand || "");
            setModel(vehicleToEdit.model || "");
            setYear(vehicleToEdit.year || "");
            setPlate(vehicleToEdit.licensePlate || "");
            setOdometer(vehicleToEdit.currentOdometer || "");
        } else {
            setName("");
            setType(VehicleType.CAR);
            setBrand("");
            setModel("");
            setYear("");
            setPlate("");
            setOdometer("");
        }
    }, [vehicleToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        
        const vehicleData = {
            name,
            type,
            brand,
            model,
            year: Number(year),
            licensePlate: plate.toUpperCase(),
            currentOdometer: Number(odometer)
        };

        await onSave(vehicleData);
        setSaving(false);
        onClose();
    };

    const TypeOption = ({ value, label, icon }: any) => (
        <button
            type="button"
            onClick={() => setType(value)}
            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                type === value 
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
            }`}
        >
            {icon}
            <span className="text-xs font-bold">{label}</span>
        </button>
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-default">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {vehicleToEdit ? <><Pencil size={20} className="text-blue-500"/> Editar Veículo</> : <><Plus size={20} className="text-emerald-500"/> Novo Veículo</>}
                    </h2>
                    <button onClick={onClose} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
                    
                    {/* TIPO DE VEÍCULO */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-2 font-bold uppercase">Tipo de Veículo</label>
                        <div className="grid grid-cols-4 gap-2">
                            <TypeOption value={VehicleType.CAR} label="Carro" icon={<Car size={20}/>} />
                            <TypeOption value={VehicleType.MOTORCYCLE} label="Moto" icon={<Bike size={20}/>} />
                            <TypeOption value={VehicleType.PICKUP} label="Pick-up" icon={<Truck size={20}/>} />
                            <TypeOption value={VehicleType.TRUCK} label="Caminhão" icon={<Truck size={20}/>} />
                        </div>
                    </div>

                    {/* ODÔMETRO EM DESTAQUE NA EDIÇÃO */}
                    {vehicleToEdit && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl">
                            <label className="block text-xs text-emerald-400 font-bold uppercase mb-2 flex items-center gap-1">
                                <Gauge size={12}/> Ajuste Manual de Odômetro
                            </label>
                            <input 
                                type="number" 
                                required 
                                value={odometer} 
                                onChange={e => setOdometer(e.target.value)} 
                                className="w-full bg-gray-900 border border-emerald-500/50 rounded-lg p-3 text-white font-mono text-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="0"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs text-gray-500 mb-1 font-bold uppercase">Apelido do Veículo</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: O Azulão" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none" required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-bold uppercase">Marca</label>
                            <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Ex: Honda" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none" required />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-bold uppercase">Modelo</label>
                            <input value={model} onChange={e => setModel(e.target.value)} placeholder="Ex: CG 160" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none" required />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-bold uppercase">Ano</label>
                            <input type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="2024" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none" required />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-bold uppercase">Placa</label>
                            <input value={plate} onChange={e => setPlate(e.target.value)} placeholder="ABC-1234" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none" required />
                        </div>
                    </div>

                    {/* Odômetro na criação */}
                    {!vehicleToEdit && (
                         <div>
                            <label className="block text-xs text-gray-500 mb-1 font-bold uppercase">Odômetro Inicial</label>
                            <div className="relative">
                                <Gauge size={16} className="absolute left-3 top-3.5 text-gray-500" />
                                <input type="number" value={odometer} onChange={e => setOdometer(e.target.value)} placeholder="0" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 pl-10 text-white focus:border-emerald-500 outline-none" required />
                            </div>
                        </div>
                    )}

                    <button type="submit" disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl mt-4 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-900/20 active:scale-95">
                        {saving ? "Salvando..." : <><Save size={20}/> Salvar Veículo</>}
                    </button>
                </form>
            </div>
        </div>
    );
}

// === PÁGINA PRINCIPAL ===
export default function VeiculosPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null); 
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, "vehicles"), where("userId", "==", auth.currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Vehicle[]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSaveVehicle = async (data: any) => {
     if (!auth.currentUser) return;

     try {
         if (vehicleToEdit) {
             const vehicleRef = doc(db, "vehicles", vehicleToEdit.id);
             await updateDoc(vehicleRef, {
                 ...data,
                 updatedAt: new Date().toISOString()
             });
         } else {
             await addDoc(collection(db, "vehicles"), {
                userId: auth.currentUser.uid,
                ...data,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
             });
         }
     } catch (error) {
         console.error("Erro ao salvar:", error);
         alert("Erro ao salvar veículo.");
     }
  };

  const handleOpenCreate = () => {
      setVehicleToEdit(null);
      setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteDoc(doc(db, "vehicles", deleteId));
      setDeleteId(null);
    }
  };

  if (loading) return <div className="text-white p-8">Carregando frota...</div>;

  return (
    <div className="pb-32 pt-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* MODAIS */}
      <ConfirmModal 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Veículo?"
        message="Ao excluir o veículo, o histórico financeiro permanecerá, mas perderá o vínculo. Continuar?"
      />

      <VehicleFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveVehicle}
        vehicleToEdit={vehicleToEdit}
      />

      <VehicleDetailsModal
        isOpen={!!selectedVehicle}
        vehicle={selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
        onEdit={(v: Vehicle) => {
            setVehicleToEdit(v);
            setIsFormOpen(true);
        }}
        onDelete={(id: string) => setDeleteId(id)}
      />

      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
           <h1 className="text-3xl font-bold text-white flex items-center gap-2">
             <Car className="text-blue-500" size={32} /> Minha Frota
           </h1>
           <p className="text-gray-400 text-sm mt-1">Gerencie seus veículos e acompanhe odômetros.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-95 cursor-pointer"
        >
          <Plus size={20} /> Adicionar Veículo
        </button>
      </header>

      {/* LISTA DE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map(v => (
          <div 
            key={v.id} 
            onClick={() => setSelectedVehicle(v)}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 relative group hover:border-blue-500/50 hover:bg-gray-800/50 transition-all cursor-pointer hover:shadow-xl hover:shadow-blue-900/10 hover:-translate-y-1"
          >
             {/* Header do Card */}
             <div className="flex justify-between items-start mb-4">
                <div className="h-14 w-14 bg-gray-800 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors shadow-inner">
                    {getVehicleIcon(v.type, 28)}
                </div>
                <div className="bg-gray-800 px-3 py-1 rounded-full border border-gray-700 group-hover:border-gray-600">
                    <span className="text-xs text-gray-400 font-bold uppercase">{getVehicleLabel(v.type)}</span>
                </div>
             </div>

             {/* Informações Principais */}
             <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{v.name}</h3>
             <p className="text-sm text-gray-500 mb-6 flex items-center gap-2">
                <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">{v.year}</span>
                {v.brand} {v.model}
             </p>

             {/* Métricas / Odômetro */}
             <div className="bg-gray-950/50 rounded-xl p-4 border border-gray-800 group-hover:border-gray-700 transition-colors">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1">
                        <Gauge size={12} /> Odômetro
                    </span>
                    <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                        ATIVO
                    </span>
                </div>
                <div className="text-2xl font-mono font-bold text-white">
                    {v.currentOdometer?.toLocaleString('pt-BR') || 0} <span className="text-sm text-gray-600 font-sans font-normal">km</span>
                </div>
             </div>

             {/* Placa Estilo "Real" */}
             <div className="mt-5 flex items-center justify-center group-hover:scale-105 transition-transform">
                 <div className="bg-white border border-gray-300 rounded-md px-4 py-1 shadow-sm relative overflow-hidden min-w-[110px]">
                     <div className="absolute top-0 left-0 w-full h-2 bg-[#003399]"></div>
                     <div className="mt-1 text-center">
                         <span className="text-black font-mono font-bold text-lg tracking-widest leading-none">
                             {v.licensePlate || "---"}
                         </span>
                     </div>
                 </div>
             </div>

          </div>
        ))}

        {vehicles.length === 0 && !loading && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-800 rounded-2xl bg-gray-900/30">
                <Car size={48} className="mx-auto text-gray-700 mb-4" />
                <h3 className="text-gray-400 font-bold text-lg">Nenhum veículo cadastrado</h3>
                <p className="text-gray-600 text-sm mt-2">Clique no botão acima para começar.</p>
            </div>
        )}
      </div>
    </div>
  );
}