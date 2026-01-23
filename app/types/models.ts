// app/types/models.ts

export interface Vehicle {
  id: string;
  userId: string;
  name: string;
  plate?: string;
  model?: string;
  createdAt: string;
  currentOdometer?: number; // <--- NOVO: O KM atual do carro (snapshot)
}

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface BaseTransaction {
  id: string;
  userId: string;
  vehicleId: string;
  type: TransactionType;
  amount: number; // Em centavos
  date: string;   // ISO String
  description?: string;
  createdAt: string;
  odometer?: number; // <--- NOVO: O KM do painel no momento do registro (Histórico)
}

export interface IncomeTransaction extends BaseTransaction {
  type: 'INCOME';
  platform: string;
  distanceDriven: number;
  onlineDurationMinutes: number;
  tripsCount?: number;
  clusterKmPerLiter?: number; 
}

export interface ExpenseTransaction extends BaseTransaction {
  type: 'EXPENSE';
  category: string;
}

export interface FuelTransaction extends ExpenseTransaction {
  category: 'Combustível';
  liters: number;
  pricePerLiter: number; 
  odometer: number; // Em abastecimentos, continua obrigatório (e sobrescreve o opcional da base)
  fuelType: string;
  stationName?: string;
  fullTank: boolean;
}

export type Transaction = IncomeTransaction | ExpenseTransaction | FuelTransaction;