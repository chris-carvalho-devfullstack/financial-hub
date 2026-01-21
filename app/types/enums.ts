// app/types/enums.ts

export enum Platform {
  // Motorista de App
  UBER = 'UBER',
  NINETY_NINE = '99',
  INDRIVER = 'INDRIVER',
  
  // Entregas
  IFOOD = 'IFOOD',
  RAPPI = 'RAPPI',
  LOGGI = 'LOGGI',
  LALAMOVE = 'LALAMOVE',
  MERCADO_LIVRE = 'MERCADO_LIVRE',
  CORNER_SHOP = 'CORNERSHOP',
  
  PARTICULAR = 'PARTICULAR',
}

export enum ExpenseCategory {
  FUEL = 'FUEL',
  MAINTENANCE = 'MAINTENANCE',
  INSURANCE = 'INSURANCE',
  TAXES = 'TAXES',
  CLEANING = 'CLEANING',
  FOOD = 'FOOD',
  PHONE = 'PHONE',
  FINANCING = 'FINANCING',
  OTHER = 'OTHER',
}

export enum FuelType {
  FLEX = 'FLEX',
  GASOLINE = 'GASOLINE',
  ETHANOL = 'ETHANOL',
  DIESEL = 'DIESEL',
  CNG = 'CNG',
  ELECTRIC = 'ELECTRIC',
}