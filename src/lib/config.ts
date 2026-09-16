// Centralized application configuration for Golden Hotel

export const APP_CONFIG = {
  // Configurable fixed delivery fee in ETB (default 100 ETB)
  DELIVERY_FEE: Number(process.env.NEXT_PUBLIC_DELIVERY_FEE || process.env.DEFAULT_DELIVERY_FEE || 100),
  CURRENCY: "ETB",
  HOTEL_NAME: "Golden Hotel",
} as const;
