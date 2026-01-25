// app/types/models.ts

import { Platform, ExpenseCategory, FuelType, VehicleType } from "./enums";

export interface Vehicle {
  id: string;
  userId: string;
  name: string;
  
  // === TIPO DO VEÍCULO (Novo) ===
  type?: VehicleType; 
  // ==============================

  // === Detalhes do Veículo ===
  brand?: string;       // Marca (Ex: Fiat)
  model?: string;       // Modelo (Ex: Mobi)
  year?: number;        // Ano
  licensePlate?: string;// Placa
  // ===========================

  currentOdometer: number;
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
  platform: Platform;
  distanceDriven: number;
  onlineDurationMinutes: number;
  tripsCount: number;
  clusterKmPerLiter?: number; // Média do painel
}

export interface ExpenseTransaction extends BaseTransaction {
  type: 'EXPENSE';
  category: ExpenseCategory;
  isFixedCost: boolean; // se é custo fixo (seguro, ipva) ou variável
  
  // Campos específicos de combustível
  fuelType?: FuelType;
  liters?: number;
  pricePerLiter?: number;
  fullTank?: boolean;
  stationName?: string;
}

export type Transaction = IncomeTransaction | ExpenseTransaction;

export interface Goal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number; // em centavos
  currentAmount: number; // em centavos
  deadline?: string;
  icon?: string; // identificador do ícone
  color?: string; // hex code
  createdAt: string;
}