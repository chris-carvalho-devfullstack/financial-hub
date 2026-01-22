// app/types/models.ts

export interface Vehicle {
  id: string;
  userId: string;
  name: string;
  plate?: string;
  model?: string;
  createdAt: string;
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
}

export interface IncomeTransaction extends BaseTransaction {
  type: 'INCOME';
  platform: string;
  distanceDriven: number;
  onlineDurationMinutes: number;
  tripsCount?: number;
  clusterKmPerLiter?: number; // <--- NOVO: Média informada pelo painel (Ex: 12.5 km/l)
}

export interface ExpenseTransaction extends BaseTransaction {
  type: 'EXPENSE';
  category: string;
}

export interface FuelTransaction extends ExpenseTransaction {
  category: 'Combustível';
  liters: number;
  pricePerLiter: number; // Preço do litro
  odometer: number;
  fuelType: string;
  stationName?: string;
  fullTank: boolean;
}

export type Transaction = IncomeTransaction | ExpenseTransaction | FuelTransaction;