// app/types/enums.ts

export enum Platform {
  // Motorista de App
  UBER = 'UBER',
  NINETY_NINE = '99', // Mantendo o valor '99' que é padrão de mercado
  INDRIVER = 'INDRIVER',

  // Entregas (Mantendo suas adições)
  IFOOD = 'IFOOD',
  RAPPI = 'RAPPI',
  LOGGI = 'LOGGI',
  LALAMOVE = 'LALAMOVE',
  MERCADO_LIVRE = 'MERCADO_LIVRE',
  CORNER_SHOP = 'CORNERSHOP',

  PARTICULAR = 'PARTICULAR',
  OTHER = 'OTHER' // Útil para casos não listados
}

export enum ExpenseCategory {
  FUEL = 'FUEL',
  MAINTENANCE = 'MAINTENANCE',
  INSURANCE = 'INSURANCE',
  TAXES = 'TAXES', // IPVA, Licenciamento
  CLEANING = 'CLEANING',
  FOOD = 'FOOD',
  
  // Suas adições mantidas
  PHONE = 'PHONE', 
  FINANCING = 'FINANCING',
  
  OTHER = 'OTHER'
}

// === NOVAS ESTRUTURAS DA FASE 1 ===

export enum VehicleType {
  CAR = 'CAR',
  MOTORCYCLE = 'MOTORCYCLE',
  SUV = 'SUV',       // Novo
  PICKUP = 'PICKUP', // Novo
  TRUCK = 'TRUCK',   // Novo
  VAN = 'VAN'        // Novo
}

export enum FuelType {
  // Removemos 'FLEX' pois agora o carro terá um tanque que aceita [GASOLINE, ETHANOL]
  GASOLINE = 'GASOLINE',
  ETHANOL = 'ETHANOL',
  DIESEL = 'DIESEL',
  CNG = 'CNG',        // Gás Natural Veicular
  LPG = 'LPG',        // Gás Liquefeito (Empilhadeiras/Outros)
  ELECTRIC = 'ELECTRIC',
  HYBRID = 'HYBRID'   // Classificação geral
}

export enum TankType {
  LIQUID = 'LIQUID',       // Tanque comum (Litros)
  PRESSURIZED = 'PRESSURIZED', // Cilindro (m³)
  BATTERY = 'BATTERY'      // Bateria (kWh)
}