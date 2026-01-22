// app/types/models.ts

export interface Vehicle {
  id: string;
  userId: string;
  name: string; // Ex: "Onix Turbo", "Titan 160"
  plate?: string;
  createdAt: string;
}

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface BaseTransaction {
  id: string;
  userId: string;
  vehicleId: string;
  type: TransactionType;
  amount: number; // Em centavos (R$ 10,00 = 1000)
  date: string;   // ISO String (YYYY-MM-DD...)
  description?: string;
  createdAt: string;
}

export interface IncomeTransaction extends BaseTransaction {
  type: 'INCOME';
  platform: string; // Uber, 99, Indrive, Particular
  distanceDriven: number; // KM rodados no dia/corrida
  onlineDurationMinutes: number; // <--- NOVO: Tempo trabalhado em minutos
  tripsCount?: number; // Quantidade de viagens
}

export interface ExpenseTransaction extends BaseTransaction {
  type: 'EXPENSE';
  category: string; // Combustível, Manutenção, Seguro, IPVA...
}

export interface FuelTransaction extends ExpenseTransaction {
  category: 'Combustível'; // Força a categoria
  liters: number;
  pricePerLiter: number;
  odometer: number; // KM atual do carro
  fuelType: string; // Gasolina, Etanol, GNV
  stationName?: string;
  fullTank: boolean;
}

export type Transaction = IncomeTransaction | ExpenseTransaction | FuelTransaction;