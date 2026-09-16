import { IPaymentProvider, InitializePaymentParams, InitializePaymentResult, VerifyPaymentResult } from "./types";

/**
 * Modular BirrPay provider stub.
 * Currently disabled in favor of Chapa as BirrPay developer onboarding is waitlist-only.
 * Ready for activation by changing ACTIVE_PAYMENT_PROVIDER to 'BIRRPAY'.
 */
export class BirrPayProvider implements IPaymentProvider {
  readonly name = "BIRRPAY" as const;

  private getBaseUrl(): string {
    return process.env.BIRRPAY_BASE_URL || "https://sandbox.birrpay.io";
  }

  async initializePayment(_params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const secretKey = process.env.BIRRPAY_SECRET_KEY;
    if (!secretKey) {
      throw new Error("BirrPay is not currently active. BIRRPAY_SECRET_KEY is missing.");
    }
    throw new Error("BirrPay provider is currently inactive while waitlist is pending. Please use Chapa.");
  }

  async verifyPayment(providerPaymentId: string): Promise<VerifyPaymentResult> {
    return {
      provider: "BIRRPAY",
      providerPaymentId,
      amount: 0,
      currency: "ETB",
      status: "FAILED",
    };
  }

  verifyWebhookSignature(_rawBody: string, _signature: string): boolean {
    return false;
  }
}

export const birrpayProvider = new BirrPayProvider();
