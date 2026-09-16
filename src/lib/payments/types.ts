export interface InitializePaymentParams {
  orderId: number;
  amount: number;
  currency: string;
  customerEmail?: string;
  customerName?: string;
  returnUrl: string;
  callbackUrl?: string;
  deliveryLocation?: string;
}

export interface InitializePaymentResult {
  provider: "CHAPA" | "BIRRPAY";
  providerPaymentId: string;
  checkoutUrl: string;
  status: "PENDING" | "PAID" | "FAILED";
  rawResponse?: unknown;
}

export interface VerifyPaymentResult {
  provider: "CHAPA" | "BIRRPAY";
  providerPaymentId: string;
  transactionId?: string;
  amount: number;
  currency: string;
  status: "PAID" | "PENDING" | "FAILED";
  rawResponse?: unknown;
}

export interface IPaymentProvider {
  readonly name: "CHAPA" | "BIRRPAY";
  initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult>;
  verifyPayment(providerPaymentId: string): Promise<VerifyPaymentResult>;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
}
