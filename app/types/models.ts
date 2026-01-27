// app/types/models.ts

import { Platform, ExpenseCategory, FuelType, VehicleType, TankType } from "./enums";

// === NOVA INTERFACE DE TANQUE (Fase 1) ===
// Permite definir se o tanque é Líquido (L), Cilindro (m³) ou Bateria (kWh)
export interface VehicleTank {
  type: TankType;
  fuelTypes: FuelType[]; // Ex: [GASOLINE, ETHANOL] para flex, ou [CNG] para GNV
  capacity: number;      // Capacidade total
  unit: 'L' | 'm3' | 'kWh'; // Unidade de medida
}

export interface Vehicle {
  id: string;
  userId: string;
  
  // Identidade do Veículo
  name: string;   // Apelido (ex: "O Azulão")
  brand: string;  // Marca (ex: Fiat)
  model: string;  // Modelo (ex: Mobi Easy)
  
  // Classificação
  type: VehicleType; // Usando o novo Enum expandido (SUV, VAN, etc.)

  // Configuração Técnica (O Coração da Fase 1)
  year: number;
  tanks: VehicleTank[]; // <--- Array de tanques: Suporte a GNV + Líquido

  // Dados Burocráticos (Novos Campos Opcionais)
  licensePlate: string;
  vin?: string;       // Chassi
  renavam?: string;   // Renavam
  notes?: string;     // Observações gerais

  // Controle
  currentOdometer: number;
  lastOdometerDate?: string; // <--- Importante para evitar retrocesso de odômetro em edições antigas
  
  createdAt?: string;
  updatedAt?: string;
}

export interface BaseTransaction {
  id: string;
  userId: string;
  vehicleId: string;
  amount: number; // em centavos
  date: string;   // ISO date
  odometer?: number; // Snapshot do odômetro no momento
  description?: string; // Observação geral
  createdAt: string;
}

export interface IncomeTransaction extends BaseTransaction {
  type: 'INCOME';
  platform: Platform; // Uber, 99, Rappi, etc.
  distanceDriven: number;
  onlineDurationMinutes: number;
  tripsCount: number;
  clusterKmPerLiter?: number; // Média do painel
  
  // Novo campo para rastreabilidade (Fase de Metas)
  linkedGoalId?: string; // ID da meta que recebeu o aporte deste ganho (se houver)
}

export interface ExpenseTransaction extends BaseTransaction {
  type: 'EXPENSE';
  category: ExpenseCategory;
  isFixedCost: boolean; // Custo fixo (seguro) ou variável (combustível)
  
  // Campos específicos de abastecimento
  fuelType?: FuelType; // <--- Qual combustível foi usado NESTE abastecimento
  liters?: number;     // Quantidade (Litros, m³ ou kWh)
  pricePerLiter?: number; // Preço unitário
  fullTank?: boolean;  // Se encheu o tanque (reset de média)
  stationName?: string;
}

export type Transaction = IncomeTransaction | ExpenseTransaction;

export interface Goal {
  id: string;
  userId: string;

  // Vínculo com Veículos (Atualizado para Múltiplos ou Nenhum)
  linkedVehicleIds?: string[]; // Array de IDs. Se vazio ou null = Meta Geral (Pessoal)

  title: string;
  targetAmount: number; // em centavos
  currentAmount: number; // em centavos
  deadline?: string;
  
  // Detalhes Visuais
  icon?: string; 
  color?: string; 
  
  // Novos Campos de Gestão (Roadmap)
  purpose?: string;     // Ex: Aposentadoria, Troca de Carro
  description?: string;
  status?: 'ACTIVE' | 'COMPLETED';
  
  createdAt: string;
}