// app/types/models.ts
import type { Platform, ExpenseCategory, FuelType } from './enums';

export interface Vehicle {
  id: string;
  userId: string;
  name: string;
  model: string;
  year: number;
  licensePlate?: string; 
  primaryFuel: FuelType;
  currentOdometer: number;
  createdAt: string;
}

export interface TransactionBase {
  id: string;
  userId: string;
  vehicleId: string;
  amount: number;
  date: string;
  description?: string;
  createdAt: string;
}

export interface IncomeTransaction extends TransactionBase {
  type: 'INCOME';
  platform: Platform;
  distanceDriven: number;
  onlineDurationMinutes?: number;
  tripsCount?: number;
}

export interface ExpenseTransaction extends TransactionBase {
  type: 'EXPENSE';
  category: ExpenseCategory;
  isFixedCost: boolean;
}

export interface FuelTransaction extends ExpenseTransaction {
  category: ExpenseCategory.FUEL;
  fuelType: FuelType;
  liters: number;        
  pricePerLiter: number; 
  odometer: number;
  fullTank: boolean;
  stationName?: string;  
}

export type Transaction = IncomeTransaction | ExpenseTransaction | FuelTransaction;