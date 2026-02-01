// app/types/models.ts

import { Platform, ExpenseCategory, FuelType, VehicleType, TankType } from "./enums";

// === NOVA INTERFACE DE TANQUE ===
// Permite definir se o tanque é Líquido (L), Cilindro (m³) ou Bateria (kWh)
export interface VehicleTank {
  type: TankType;
  fuelTypes: FuelType[]; // Ex: [GASOLINE, ETHANOL] para flex, ou [CNG] para GNV
  capacity: number;      // Capacidade total
  unit: 'L' | 'm3' | 'kWh'; // Unidade de medida
}

// === VEÍCULO ===
export interface Vehicle {
  id: string;
  userId: string;
  
  // Identidade do Veículo
  name: string;   // Apelido (ex: "O Azulão")
  brand: string;  // Marca (ex: Fiat)
  model: string;  // Modelo (ex: Mobi Easy)
  
  // Classificação
  type: VehicleType; // SUV, SEDAN, HATCH, etc.

  // Configuração Técnica
  year: number;
  tanks: VehicleTank[]; // Array de tanques (Suporte a GNV + Líquido)

  // Dados Burocráticos
  licensePlate?: string; // Padrão novo
  plate?: string;        // Compatibilidade com Admin Panel
  vin?: string;          // Chassi
  renavam?: string;      // Renavam
  notes?: string;        // Observações gerais

  // Controle
  currentOdometer: number;
  lastOdometerDate?: string; // Importante para evitar retrocesso lógico
  isDefault?: boolean;
  
  createdAt?: string;
  updatedAt?: string;
}

// === TRANSAÇÕES (BASE) ===
export interface BaseTransaction {
  id: string;
  userId: string;
  vehicleId: string;
  amount: number; // em centavos
  date: string;   // ISO date
  odometer?: number; // Snapshot do odômetro no momento
  description?: string; // Observação geral
  createdAt?: string;
  updatedAt?: string;
}

// === TRANSAÇÃO DE GANHO (INCOME) ===
export interface IncomeTransaction extends BaseTransaction {
  type: 'INCOME';
  platform: Platform | 'MULTIPLE'; // Uber, 99, ou Múltiplos
  
  // Detalhamento quando platform === 'MULTIPLE'
  split?: { 
    platform: Platform; 
    amount: number; // Valor em centavos
    trips?: number; // Quantidade de corridas por app
  }[];

  distanceDriven: number;
  onlineDurationMinutes: number;
  tripsCount: number;
  clusterKmPerLiter?: number; // Média do painel
  
  // Rastreabilidade (Metas)
  linkedGoalId?: string | null;
}

// === TRANSAÇÃO DE COMBUSTÍVEL (ESPECÍFICA) ===
// IMPORTANTE: Exportado separadamente para uso no Timeline
export interface FuelTransaction extends BaseTransaction {
  type: 'EXPENSE';
  category: ExpenseCategory.FUEL;
  
  // Campos obrigatórios para combustível
  fuelType: FuelType;     // Qual combustível foi usado
  liters: number;         // Quantidade (Litros/m³/kWh)
  pricePerLiter: number;  // Preço unitário
  fullTank: boolean;      // Tanque cheio?
  stationName?: string;   // Nome do Posto
  
  isFixedCost?: boolean;
}

// === TRANSAÇÃO DE DESPESA GERAL ===
export interface GeneralExpenseTransaction extends BaseTransaction {
  type: 'EXPENSE';
  category: Exclude<ExpenseCategory, ExpenseCategory.FUEL>; // Qualquer categoria MENOS Fuel
  isFixedCost: boolean;
}

// === UNIÕES DE TIPOS ===
// Isso permite que o TypeScript saiba quais campos estão disponíveis baseados no 'category'
export type ExpenseTransaction = FuelTransaction | GeneralExpenseTransaction;
export type Transaction = IncomeTransaction | ExpenseTransaction;

// === METAS (GOALS) ===
export interface Goal {
  id: string;
  userId: string;

  // Vínculo com Veículos
  linkedVehicleIds?: string[]; // Se vazio = Meta Geral

  title: string;
  targetAmount: number;  // em centavos
  currentAmount: number; // em centavos
  deadline?: string;
  
  // Detalhes Visuais
  icon?: string; 
  color?: string; 
  
  // Gestão
  purpose?: string;     // Ex: Aposentadoria, Troca de Carro
  description?: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'IN_PROGRESS';
  
  createdAt: string;
  updatedAt?: string;
}

// === PERFIL DO USUÁRIO (SAAS / ADMIN) ===
export interface UserProfile {
  id: string; // Atualizado para 'id' (Supabase Auth padrão)
  email: string;
  
  // Identificação Visual
  name?: string; 
  phone?: string;
  photoUrl?: string;

  // Permissões
  role?: 'ADMIN' | 'USER'; 

  // Assinatura (SaaS)
  plan: 'FREE' | 'PRO'; 
  subscriptionStatus: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'EXPIRED' | 'BLOCKED'; 
  subscriptionEndsAt?: string; 
  stripeCustomerId?: string; 

  // Métricas
  canceledAt?: string; 
  lastLogin?: string; 
  
  // Preferências
  lastSelectedVehicleId?: string; 
  
  createdAt?: string;
  updatedAt?: string;
}