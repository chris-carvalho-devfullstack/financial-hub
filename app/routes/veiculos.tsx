// app/routes/veiculos.tsx

import { useEffect, useState } from "react";
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { 
  Car, Plus, Trash2, Gauge, Calendar, AlertTriangle, 
  Pencil, Save, X, Bike, Truck, Info, 
  Fuel, Flame, Zap, PenTool
} from "lucide-react";
import { db, auth } from "~/lib/firebase.client";
import { VehicleType, TankType, FuelType } from "~/types/enums";
import type { Vehicle, VehicleTank } from "~/types/models";

// === LISTA DE MARCAS ===
const BRAND_LIST = [
  { name: "Audi", slug: "audi" },
  { name: "BMW", slug: "bmw" },
  { name: "BYD", slug: "byd" },
  { name: "Caoa Chery", slug: "caoa-chery" },
  { name: "Chevrolet", slug: "chevrolet" },
  { name: "Citroën", slug: "citroen" },
  { name: "Fiat", slug: "fiat" },
  { name: "Ford", slug: "ford" },
  { name: "Honda", slug: "honda" },
  { name: "Hyundai", slug: "hyundai" },
  { name: "JAC", slug: "jac" },
  { name: "Jeep", slug: "jeep" },
  { name: "Kia", slug: "kia" },
  { name: "Land Rover", slug: "land-rover" },
  { name: "Mercedes-Benz", slug: "mercedes" },
  { name: "Mitsubishi", slug: "mitsubishi" },
  { name: "Nissan", slug: "nissan" },
  { name: "Peugeot", slug: "peugeot" },
  { name: "Renault", slug: "renault" },
  { name: "Toyota", slug: "toyota" },
  { name: "Volkswagen", slug: "volkswagen" },
  { name: "Volvo", slug: "volvo" },
].sort((a, b) => a.name.localeCompare(b.name));

// === UTILITÁRIOS ===
const getVehicleIcon = (type?: VehicleType, size = 24, className = "") => {
    switch (type) {
        case VehicleType.MOTORCYCLE: return <Bike size={size} className={className} />;
        case VehicleType.TRUCK: return <Truck size={size} className={className} />;
        case VehicleType.PICKUP: return <Truck size={size} className={className} />; 
        case VehicleType.VAN: return <Truck size={size} className={className} />;
        case VehicleType.SUV: return <Car size={size} className={className} />;
        case VehicleType.CAR:
        default: return <Car size={size} className={className} />;
    }
};

const getVehicleLabel = (type?: VehicleType) => {
    switch (type) {
        case VehicleType.MOTORCYCLE: return "Moto";
        case VehicleType.TRUCK: return "Caminhão";
        case VehicleType.PICKUP: return "Pick-up";
        case VehicleType.SUV: return "SUV";
        case VehicleType.VAN: return "Van";
        case VehicleType.CAR:
        default: return "Carro";
    }
};

// === COMPONENTES DE MODAL ===

function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-default animate-in fade-in duration-200">
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

function VehicleDetailsModal({ isOpen, onClose, vehicle, onEdit, onDelete }: any) {
    if (!isOpen || !vehicle) return null;

    const Icon = getVehicleIcon(vehicle.type, 40, "text-white");
    const v = vehicle as Vehicle & { lastOdometerDate?: string };
    const brandSlug = BRAND_LIST.find(b => b.name.toLowerCase() === (v.brand || "").toLowerCase())?.slug;

    // LÓGICA DE DATA: Prioriza a data específica da leitura do odômetro
    // Se não existir, usa updatedAt (fallback)
    const displayDate = v.lastOdometerDate || v.updatedAt || v.createdAt;

    // Formata a data ajustando o fuso horário para exibir corretamente
    const formattedDate = displayDate 
        ? new Date(displayDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) 
        : "--/--/----";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-default">
            <div className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 fade-in duration-300">
                
                {/* Header */}
                <div className="relative bg-gradient-to-r from-blue-900/40 to-gray-900 p-6 flex items-center gap-5 border-b border-gray-800">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors cursor-pointer z-10">
                        <X size={20} />
                    </button>

                    <div className="h-20 w-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20 transform -rotate-3 border border-blue-500/30 overflow-hidden relative">
                         {brandSlug ? (
                             <>
                                <img 
                                    src={`/logos/brands/${brandSlug}.png`} 
                                    alt={v.brand} 
                                    className="w-16 h-16 object-contain z-10"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                                <div className="hidden absolute inset-0 flex items-center justify-center">{Icon}</div>
                             </>
                         ) : (Icon)}
                    </div>
                    
                    <div>
                        <h2 className="text-2xl font-bold text-white leading-none mb-1">{v.name}</h2>
                        <span className="text-blue-200 text-sm font-medium flex items-center gap-1.5 opacity-80">
                           <Info size={14}/> Detalhes da Frota
                        </span>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto bg-gray-950/30 custom-scrollbar">
                    
                    {/* Placa e Ano */}
                    <div className="flex gap-4">
                        <div className="flex-1 bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg relative min-h-[60px] flex flex-col items-center group hover:scale-[1.02] transition-transform duration-300">
                            <div className="w-full h-6 bg-[#003399] flex items-center justify-between px-3 relative">
                                <span className="text-[8px] font-bold text-white tracking-widest">BRASIL</span>
                                <div className="absolute right-2 top-1 w-4 h-3 bg-blue-400/30 rounded-sm"></div>
                            </div>
                            <div className="flex-1 flex items-center justify-center py-1">
                                <span className="text-black font-mono font-bold text-3xl tracking-widest uppercase transform scale-x-110">
                                    {v.licensePlate || "SEM-PLACA"}
                                </span>
                            </div>
                        </div>
                        <div className="w-1/3 bg-gray-800 border border-gray-700 rounded-xl flex flex-col items-center justify-center p-2 shadow-inner">
                            <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">Ano/Modelo</span>
                            <span className="text-xl text-white font-bold flex items-center gap-1">
                                <Calendar size={16} className="text-blue-500"/>
                                {v.year || "----"}
                            </span>
                        </div>
                    </div>

                    {/* Tanques */}
                    {v.tanks && v.tanks.length > 0 && (
                        <div className="bg-gray-800/30 rounded-2xl border border-gray-700 p-4">
                            <h4 className="text-xs text-gray-400 font-bold uppercase mb-3 flex items-center gap-2">
                                <Fuel size={14} className="text-emerald-500"/> Sistema de Energia
                            </h4>
                            <div className="space-y-2">
                                {v.tanks.map((tank, idx) => (
                                    <div key={idx} className="bg-gray-900 border border-gray-800 p-3 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tank.type === TankType.LIQUID ? 'bg-red-500/10 text-red-500' : tank.type === TankType.PRESSURIZED ? 'bg-blue-500/10 text-blue-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                                {tank.type === TankType.LIQUID ? <Fuel size={16}/> : tank.type === TankType.PRESSURIZED ? <Flame size={16}/> : <Zap size={16}/>}
                                            </div>
                                            <div>
                                                <p className="text-sm text-white font-bold">
                                                    {tank.type === TankType.LIQUID ? 'Tanque Líquido' : tank.type === TankType.PRESSURIZED ? 'Cilindro GNV' : 'Bateria EV'}
                                                </p>
                                                <p className="text-[10px] text-gray-500 flex gap-1">
                                                    {tank.fuelTypes.map(f => (
                                                        <span key={f} className="bg-gray-800 px-1 rounded">{f}</span>
                                                    ))}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-mono font-bold text-white">{tank.capacity}</span>
                                            <span className="text-xs text-gray-500 ml-1">{tank.unit}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Detalhes Gerais */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700/50 flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">Marca</span>
                            <span className="text-base text-gray-200 font-semibold truncate">{v.brand || "---"}</span>
                        </div>
                        <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700/50 flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">Modelo</span>
                            <span className="text-base text-gray-200 font-semibold truncate">{v.model || "---"}</span>
                        </div>
                        {v.vin && (
                            <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700/50 flex flex-col col-span-2">
                                <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">Chassi (VIN)</span>
                                <span className="text-xs text-gray-300 font-mono tracking-wider">{v.vin}</span>
                            </div>
                        )}
                        {v.renavam && (
                            <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-700/50 flex flex-col col-span-2">
                                <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">Renavam</span>
                                <span className="text-xs text-gray-300 font-mono tracking-wider">{v.renavam}</span>
                            </div>
                        )}
                    </div>

                    {/* ODÔMETRO */}
                    <div className="relative overflow-hidden rounded-2xl bg-black border border-gray-800 p-5 shadow-2xl ring-1 ring-white/5">
                         <div className="absolute top-0 right-0 p-3 opacity-20 blur-xl">
                             <Gauge size={100} className="text-emerald-500" />
                         </div>
                         <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></div>
                                    Painel do Veículo
                                </span>
                                {formattedDate && (
                                    <span className="text-[9px] text-gray-500 font-mono flex items-center gap-1 bg-gray-900/80 px-2 py-1 rounded border border-gray-800">
                                        <Calendar size={10} className="text-gray-600"/>
                                        Ref: {formattedDate}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-mono font-bold text-white tracking-tighter drop-shadow-lg">
                                    {(v.currentOdometer || 0).toLocaleString('pt-BR')}
                                </span>
                                <span className="text-xl text-gray-500 font-sans font-medium">km</span>
                            </div>
                         </div>
                    </div>

                </div>

                <div className="p-6 bg-gray-900 border-t border-gray-800 flex gap-3">
                    <button onClick={() => { onClose(); onEdit(vehicle); }} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20 cursor-pointer">
                        <Pencil size={18} /> Editar Dados
                    </button>
                    <button onClick={() => { onClose(); onDelete(vehicle.id); }} className="flex-none w-14 flex items-center justify-center rounded-xl bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-95 cursor-pointer border border-gray-700 hover:border-red-500/50">
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
    const [odometerDate, setOdometerDate] = useState(""); // Campo separado para a data do odômetro
    
    // Avançados
    const [vin, setVin] = useState("");
    const [renavam, setRenavam] = useState("");
    const [notes, setNotes] = useState("");
    const [isCustomBrand, setIsCustomBrand] = useState(false);
    const [tanks, setTanks] = useState<VehicleTank[]>([
        { type: TankType.LIQUID, fuelTypes: [FuelType.GASOLINE, FuelType.ETHANOL], capacity: 50, unit: 'L' }
    ]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (vehicleToEdit) {
            const v = vehicleToEdit as any;
            setName(v.name);
            setType(v.type);
            setBrand(v.brand);
            setIsCustomBrand(!BRAND_LIST.some(b => b.name === v.brand));
            setModel(v.model);
            setYear(String(v.year));
            setPlate(v.licensePlate);
            setOdometer(String(v.currentOdometer));
            
            // LÓGICA DE PREENCHIMENTO DA DATA NO INPUT
            // 1. Tenta pegar a data específica (lastOdometerDate)
            // 2. Se não tiver, tenta a data de atualização
            // 3. Se não tiver, usa Hoje.
            // .split('T')[0] converte ISO (2026-01-24T...) para YYYY-MM-DD aceito pelo input type="date"
            const refDate = v.lastOdometerDate ? new Date(v.lastOdometerDate) : (v.updatedAt ? new Date(v.updatedAt) : new Date());
            setOdometerDate(refDate.toISOString().split('T')[0]);

            setVin(v.vin || "");
            setRenavam(v.renavam || "");
            setNotes(v.notes || "");
            setTanks(v.tanks || []);
        } else {
            // Novo Veículo
            setName("");
            setType(VehicleType.CAR);
            setBrand("");
            setIsCustomBrand(false);
            setModel("");
            setYear("");
            setPlate("");
            setOdometer("");
            setOdometerDate(new Date().toISOString().split('T')[0]); // Padrão: Hoje
            setVin("");
            setRenavam("");
            setNotes("");
            setTanks([{ type: TankType.LIQUID, fuelTypes: [FuelType.GASOLINE, FuelType.ETHANOL], capacity: 50, unit: 'L' }]);
        }
    }, [vehicleToEdit, isOpen]);

    if (!isOpen) return null;

    const addTank = () => setTanks([...tanks, { type: TankType.PRESSURIZED, fuelTypes: [FuelType.CNG], capacity: 15, unit: 'm3' }]);
    const removeTank = (idx: number) => {
        if (tanks.length === 1) return alert("O veículo precisa de pelo menos 1 fonte de energia.");
        setTanks(tanks.filter((_, i) => i !== idx));
    };
    const updateTank = (idx: number, field: keyof VehicleTank, value: any) => {
        const newTanks = [...tanks];
        newTanks[idx] = { ...newTanks[idx], [field]: value };
        if (field === 'type') {
            if (value === TankType.LIQUID) {
                newTanks[idx].unit = 'L';
                newTanks[idx].fuelTypes = [FuelType.GASOLINE, FuelType.ETHANOL];
            } else if (value === TankType.PRESSURIZED) {
                newTanks[idx].unit = 'm3';
                newTanks[idx].fuelTypes = [FuelType.CNG];
            } else if (value === TankType.BATTERY) {
                newTanks[idx].unit = 'kWh';
                newTanks[idx].fuelTypes = [FuelType.ELECTRIC];
            }
        }
        setTanks(newTanks);
    };
    const toggleFuel = (idx: number, fuel: FuelType) => {
        const tank = tanks[idx];
        const hasFuel = tank.fuelTypes.includes(fuel);
        const newFuels = hasFuel ? tank.fuelTypes.filter(f => f !== fuel) : [...tank.fuelTypes, fuel];
        if (newFuels.length === 0) return alert("Selecione pelo menos um combustível.");
        updateTank(idx, 'fuelTypes', newFuels);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const vehicleData = {
            name, type, brand, model,
            year: Number(year),
            licensePlate: plate.toUpperCase(),
            currentOdometer: Number(odometer),
            // AQUI ESTÁ O SEGREDO: Salva explicitamente a data escolhida no input
            lastOdometerDate: new Date(odometerDate).toISOString(), 
            vin, renavam, notes, tanks
        };
        await onSave(vehicleData);
        setSaving(false);
        onClose();
    };

    const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-default">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-950 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {vehicleToEdit ? <><Pencil size={20} className="text-blue-500"/> Editar Veículo</> : <><Plus size={20} className="text-emerald-500"/> Novo Veículo</>}
                    </h2>
                    <button onClick={onClose} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    
                    {/* TIPO */}
                    <div>
                        <label className="text-xs text-gray-500 font-bold uppercase mb-2 block">Tipo de Veículo</label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {Object.values(VehicleType).map(t => (
                                <button key={t} type="button" onClick={() => setType(t as VehicleType)} className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all cursor-pointer ${type === t ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>
                                    {getVehicleIcon(t as VehicleType, 18)}
                                    <span className="text-[10px] font-bold">{getVehicleLabel(t as VehicleType)}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* MARCA */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <label className="text-xs text-gray-500 font-bold uppercase">Marca</label>
                             {isCustomBrand && (<button type="button" onClick={() => { setIsCustomBrand(false); setBrand(""); }} className="text-[10px] text-blue-400 hover:underline cursor-pointer">Voltar para lista</button>)}
                        </div>
                        {isCustomBrand ? (
                             <div className="relative">
                                <PenTool className="absolute left-3 top-3.5 text-gray-500" size={16}/>
                                <input value={brand} onChange={e => setBrand(e.target.value)} className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 pl-10 text-white focus:border-emerald-500 outline-none" placeholder="Digite o nome da marca..." autoFocus />
                             </div>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                {BRAND_LIST.map((b) => (
                                    <button key={b.slug} type="button" onClick={() => setBrand(b.name)} className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all cursor-pointer relative group ${brand === b.name ? 'bg-white text-black border-white shadow-lg scale-105' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
                                        <img src={`/logos/brands/${b.slug}.png`} alt={b.name} className="w-8 h-8 object-contain mb-1" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                                        <div className="hidden w-8 h-8 flex items-center justify-center font-bold text-[10px] uppercase bg-gray-200/10 rounded-full mb-1">{b.name.substring(0, 1)}</div>
                                        <span className="text-[10px] font-bold truncate w-full text-center leading-tight">{b.name}</span>
                                    </button>
                                ))}
                                <button type="button" onClick={() => setIsCustomBrand(true)} className="p-2 rounded-lg border border-dashed border-gray-600 bg-transparent text-gray-500 hover:text-white hover:border-gray-400 flex flex-col items-center justify-center gap-1 cursor-pointer">
                                    <Plus size={16} />
                                    <span className="text-[9px] font-bold">Outra</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Modelo</label>
                            <input value={model} onChange={e => setModel(e.target.value)} className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none" placeholder="Ex: Onix Plus 1.0" required />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Apelido (Opcional)</label>
                            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none" placeholder="Ex: O Azulão" />
                        </div>
                    </div>

                    {/* Tanques */}
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                        <div className="flex justify-between items-center mb-3">
                             <h3 className="text-emerald-400 font-bold text-sm flex items-center gap-2"><Fuel size={18}/> Fontes de Energia</h3>
                             <button type="button" onClick={addTank} className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer">+ Adicionar</button>
                        </div>
                        <div className="space-y-3">
                            {tanks.map((tank, idx) => (
                                <div key={idx} className="bg-gray-900 p-3 rounded-lg border border-gray-800 relative group">
                                    <div className="flex flex-col sm:flex-row gap-3 mb-2">
                                        <select value={tank.type} onChange={e => updateTank(idx, 'type', e.target.value)} className="bg-gray-800 text-white text-sm rounded px-2 py-2 border border-gray-700 w-full sm:w-1/3 outline-none cursor-pointer">
                                            <option value={TankType.LIQUID}>Líquido (L)</option>
                                            <option value={TankType.PRESSURIZED}>GNV (m³)</option>
                                            <option value={TankType.BATTERY}>Elétrico (kWh)</option>
                                        </select>
                                        <div className="flex-1 flex items-center gap-1 bg-gray-800 rounded px-2 border border-gray-700">
                                            <input type="number" value={tank.capacity} onChange={e => updateTank(idx, 'capacity', Number(e.target.value))} className={`bg-transparent text-white text-sm w-full outline-none py-2 ${noSpinnerClass}`} placeholder="Capacidade" />
                                            <span className="text-gray-500 text-xs font-bold">{tank.unit}</span>
                                        </div>
                                        {tanks.length > 1 && (<button type="button" onClick={() => removeTank(idx)} className="text-red-500 p-2 hover:bg-red-500/10 rounded flex items-center justify-center cursor-pointer"><Trash2 size={16}/></button>)}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-800/50">
                                        {(tank.type === TankType.LIQUID ? [FuelType.GASOLINE, FuelType.ETHANOL, FuelType.DIESEL] : tank.type === TankType.PRESSURIZED ? [FuelType.CNG] : [FuelType.ELECTRIC]).map(f => {
                                              const isSelected = tank.fuelTypes.includes(f);
                                              return (
                                                  <button key={f} type="button" onClick={() => toggleFuel(idx, f)} className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all border cursor-pointer ${isSelected ? 'bg-blue-500 border-blue-400 text-white shadow-md' : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500'}`}>
                                                      {f === 'GASOLINE' ? 'Gasolina' : f === 'ETHANOL' ? 'Etanol' : f === 'CNG' ? 'GNV' : f}
                                                  </button>
                                              )
                                          })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Ano</label>
                            <input type="number" value={year} onChange={e => setYear(e.target.value)} className={`w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white ${noSpinnerClass}`} placeholder="2024" required />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Placa</label>
                            <input value={plate} onChange={e => setPlate(e.target.value)} className="w-full bg-gray-800 border-gray-700 rounded-lg p-3 text-white" placeholder="ABC-1234" required />
                        </div>
                    </div>
                    
                    {/* === ODÔMETRO COM DATA MANUAL === */}
                    <div className={`${vehicleToEdit ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-500/5 border border-emerald-500/20'} p-4 rounded-xl`}>
                        <div className="flex justify-between mb-2">
                            <label className="text-xs text-emerald-400 font-bold uppercase flex items-center gap-1">
                                <Gauge size={12}/> {vehicleToEdit ? 'Ajuste Manual Odômetro' : 'Odômetro Inicial'}
                            </label>
                            <label className="text-[10px] text-gray-400 uppercase font-bold">Data da Leitura</label>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                { !vehicleToEdit && <Gauge size={18} className="absolute left-3 top-3.5 text-emerald-500" /> }
                                <input 
                                    type="number" required value={odometer} onChange={e => setOdometer(e.target.value)} 
                                    className={`w-full bg-gray-900 border border-emerald-500/50 rounded-lg p-3 ${!vehicleToEdit ? 'pl-10' : ''} text-white font-mono text-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none ${noSpinnerClass}`} 
                                    placeholder="0" 
                                />
                            </div>
                            {/* INPUT DE DATA DA LEITURA */}
                            <input 
                                type="date" 
                                value={odometerDate} 
                                onChange={e => setOdometerDate(e.target.value)}
                                className="bg-gray-900 border border-emerald-500/50 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        {vehicleToEdit && <p className="text-[10px] text-gray-500 mt-2">Dica: Ajuste a data se a quilometragem for de um dia anterior.</p>}
                    </div>

                    {/* DOCUMENTAÇÃO */}
                    <div className="pt-2">
                        <details className="group bg-gray-800/20 rounded-xl border border-gray-800">
                            <summary className="text-xs text-gray-500 font-bold uppercase cursor-pointer list-none flex items-center gap-2 p-3 hover:text-white transition-colors select-none"><Info size={14}/> Documentação & Notas (Opcional)</summary>
                            <div className="space-y-3 p-3 pt-0 border-t border-gray-800/50 mt-2">
                                <input value={vin} onChange={e => setVin(e.target.value)} className="w-full bg-gray-800 border-gray-700 rounded-lg p-2 text-sm text-white" placeholder="Chassi (VIN)" />
                                <input value={renavam} onChange={e => setRenavam(e.target.value)} className="w-full bg-gray-800 border-gray-700 rounded-lg p-2 text-sm text-white" placeholder="Renavam" />
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-gray-800 border-gray-700 rounded-lg p-2 text-sm text-white resize-none h-20" placeholder="Observações..." />
                            </div>
                        </details>
                    </div>

                    <button type="submit" disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mt-2 cursor-pointer">
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
         const now = new Date().toISOString();
         // A data manual (lastOdometerDate) já vem corretamente do form.
         // updatedAt é sempre 'agora' para controle de versão do documento
         const dataToSave: any = { ...data, updatedAt: now };

         if (vehicleToEdit) {
             const vehicleRef = doc(db, "vehicles", vehicleToEdit.id);
             await updateDoc(vehicleRef, dataToSave);
         } else {
             // Novo veículo
             await addDoc(collection(db, "vehicles"), {
                userId: auth.currentUser.uid,
                ...dataToSave,
                createdAt: now
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

  // Helper para formatar a data corrigida para UTC (evita erro de fuso)
  const formatDate = (isoString?: string) => {
      if (!isoString) return "--/--";
      const datePart = isoString.split('T')[0];
      const [year, month, day] = datePart.split('-');
      return `${day}/${month}/${year}`;
  };

  if (loading) return <div className="text-white p-8">Carregando frota...</div>;

  return (
    <div className="pb-32 pt-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <ConfirmModal 
        isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Excluir Veículo?" message="Ao excluir o veículo, o histórico financeiro permanecerá, mas perderá o vínculo. Continuar?"
      />

      <VehicleFormModal 
        isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSaveVehicle} vehicleToEdit={vehicleToEdit}
      />

      <VehicleDetailsModal
        isOpen={!!selectedVehicle} vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)}
        onEdit={(v: Vehicle) => { setVehicleToEdit(v); setIsFormOpen(true); }}
        onDelete={(id: string) => setDeleteId(id)}
      />

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
           <h1 className="text-3xl font-bold text-white flex items-center gap-2">
             <Car className="text-blue-500" size={32} /> Minha Frota
           </h1>
           <p className="text-gray-400 text-sm mt-1">Gerencie seus veículos e acompanhe odômetros.</p>
        </div>
        <button onClick={handleOpenCreate} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-95 cursor-pointer">
          <Plus size={20} /> Adicionar Veículo
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map(v => {
           const brandSlug = BRAND_LIST.find(b => b.name.toLowerCase() === (v.brand || "").toLowerCase())?.slug;
           const vehicleAny = v as any;
           // HIERARQUIA DE DATA:
           // 1. lastOdometerDate (Definido manualmente ou futuramente por transações)
           // 2. updatedAt (Fallback)
           // 3. createdAt (Fallback Final)
           const displayDate = vehicleAny.lastOdometerDate || v.updatedAt || v.createdAt;

           return (
            <div key={v.id} onClick={() => setSelectedVehicle(v)} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 relative group hover:border-blue-500/50 hover:bg-gray-800/50 transition-all cursor-pointer hover:shadow-xl hover:shadow-blue-900/10 hover:-translate-y-1">
                <div className="flex justify-between items-start mb-4">
                    <div className="h-14 w-14 bg-gray-800 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors shadow-inner relative overflow-hidden">
                        {brandSlug ? (
                             <>
                                <img src={`/logos/brands/${brandSlug}.png`} alt={v.brand} className="w-12 h-12 object-contain z-10" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                                <div className="hidden absolute inset-0 flex items-center justify-center">{getVehicleIcon(v.type, 28)}</div>
                             </>
                        ) : (getVehicleIcon(v.type, 28))}
                    </div>
                    <div className="bg-gray-800 px-3 py-1 rounded-full border border-gray-700 group-hover:border-gray-600">
                        <span className="text-xs text-gray-400 font-bold uppercase">{getVehicleLabel(v.type)}</span>
                    </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{v.name || v.brand + ' ' + v.model}</h3>
                <p className="text-sm text-gray-500 mb-6 flex items-center gap-2">
                    <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">{v.year}</span>
                    {v.brand} {v.model}
                </p>

                <div className="bg-gray-950/50 rounded-xl p-4 border border-gray-800 group-hover:border-gray-700 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500 uppercase font-bold flex items-center gap-1"><Gauge size={12} /> Odômetro</span>
                        {displayDate && (
                            <span className="text-[9px] text-gray-600 font-mono">Ref: {formatDate(displayDate)}</span>
                        )}
                    </div>
                    <div className="text-2xl font-mono font-bold text-white">
                        {v.currentOdometer?.toLocaleString('pt-BR') || 0} <span className="text-sm text-gray-600 font-sans font-normal">km</span>
                    </div>
                </div>

                <div className="mt-5 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <div className="bg-white border border-gray-300 rounded-md px-4 py-1 shadow-sm relative overflow-hidden min-w-[110px]">
                        <div className="absolute top-0 left-0 w-full h-2 bg-[#003399]"></div>
                        <div className="mt-1 text-center">
                            <span className="text-black font-mono font-bold text-lg tracking-widest leading-none">{v.licensePlate || "---"}</span>
                        </div>
                    </div>
                </div>
            </div>
           );
        })}

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