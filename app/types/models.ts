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

  // Dados Burocráticos
  licensePlate?: string; // Padrão novo
  plate?: string;        // <--- ADICIONADO: Compatibilidade com Admin Panel (corrige o erro ts(2339))
  vin?: string;       // Chassi
  renavam?: string;   // Renavam
  notes?: string;     // Observações gerais

  // Controle
  currentOdometer: number;
  lastOdometerDate?: string; // <--- Importante para evitar retrocesso de odômetro em edições antigas
  isDefault?: boolean; // Mantido para compatibilidade com seletores rápidos
  
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
  updatedAt?: string; // Adicionado para consistência
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
  litros?: number;     // Quantidade (Litros, m³ ou kWh) - Padronizado para português
  liters?: number;     // Alias para compatibilidade se o backend enviar em inglês
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
  category?: string; // Mantido para compatibilidade
  
  // Novos Campos de Gestão (Roadmap)
  purpose?: string;     // Ex: Aposentadoria, Troca de Carro
  description?: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'IN_PROGRESS';
  
  createdAt: string;
  updatedAt?: string;
}

// === ATUALIZAÇÃO PARA SAAS / ADMIN ===
export interface UserProfile {
  uid: string;
  email: string;
  
  // Identificação Visual (Útil para o Admin)
  name?: string; 
  phone?: string;
  photoUrl?: string;

  // === PERMISSÕES (Adicionado para o Admin Panel) ===
  role?: 'ADMIN' | 'USER'; 

  // === DADOS DE ASSINATURA (SaaS) ===
  plan: 'FREE' | 'PRO'; 
  // Adicionado 'BLOCKED' para suportar o botão de bloqueio
  subscriptionStatus: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'EXPIRED' | 'BLOCKED'; 
  subscriptionEndsAt?: string; // Data de expiração (ISO)
  stripeCustomerId?: string; // Útil para integrações futuras

  // === MÉTRICAS DE RETENÇÃO (Churn) ===
  canceledAt?: string; 
  lastLogin?: string; // Adicionado para exibir no Modal de Detalhes
  
  // Preferências do App
  lastSelectedVehicleId?: string; 
  
  createdAt?: string;
  updatedAt?: string;
}