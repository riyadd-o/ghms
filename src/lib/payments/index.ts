import { IPaymentProvider } from "./types";
import { chapaProvider } from "./chapa";
import { birrpayProvider } from "./birrpay";

export * from "./types";
export * from "./chapa";
export * from "./birrpay";

/**
 * Returns the currently active digital payment provider.
 * Defaults to Chapa.
 */
export function getDigitalPaymentProvider(): IPaymentProvider {
  const providerEnv = (process.env.ACTIVE_PAYMENT_PROVIDER || "CHAPA").toUpperCase();
  if (providerEnv === "BIRRPAY") {
    return birrpayProvider;
  }
  return chapaProvider;
}
