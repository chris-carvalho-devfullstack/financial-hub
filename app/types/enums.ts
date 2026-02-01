// app/types/enums.ts

export enum Platform {
  // Motorista de App
  UBER = 'UBER',
  NINETY_NINE = '99', // Mantendo o valor '99'
  INDRIVER = 'INDRIVER',

  // Entregas
  IFOOD = 'IFOOD',
  RAPPI = 'RAPPI',
  LOGGI = 'LOGGI',
  LALAMOVE = 'LALAMOVE',
  MERCADO_LIVRE = 'MERCADO_LIVRE',
  CORNER_SHOP = 'CORNERSHOP',

  PARTICULAR = 'PARTICULAR',
  OTHER = 'OTHER',
  
  // === IMPORTANTE: Necessário para o recurso de múltiplos apps ===
  MULTIPLE = 'MULTIPLE' 
}

export enum ExpenseCategory {
  FUEL = 'FUEL',
  MAINTENANCE = 'MAINTENANCE',
  INSURANCE = 'INSURANCE',
  TAXES = 'TAXES', // IPVA, Licenciamento
  CLEANING = 'CLEANING',
  FOOD = 'FOOD',
  
  PHONE = 'PHONE', 
  FINANCING = 'FINANCING',
  
  OTHER = 'OTHER'
}

// === NOVAS ESTRUTURAS DA FASE 1 ===

export enum VehicleType {
  CAR = 'CAR',
  MOTORCYCLE = 'MOTORCYCLE',
  SUV = 'SUV',       
  PICKUP = 'PICKUP', 
  TRUCK = 'TRUCK',   
  VAN = 'VAN'        
}

export enum FuelType {
  GASOLINE = 'GASOLINE',
  ETHANOL = 'ETHANOL',
  DIESEL = 'DIESEL',
  CNG = 'CNG',        // Gás Natural Veicular
  LPG = 'LPG',        // Gás Liquefeito
  ELECTRIC = 'ELECTRIC',
  HYBRID = 'HYBRID'   
}

export enum TankType {
  LIQUID = 'LIQUID',       // Tanque comum (Litros)
  PRESSURIZED = 'PRESSURIZED', // Cilindro (m³)
  BATTERY = 'BATTERY'      // Bateria (kWh)
}