import crypto from "crypto";
import { IPaymentProvider, InitializePaymentParams, InitializePaymentResult, VerifyPaymentResult } from "./types";

export class ChapaProvider implements IPaymentProvider {
  readonly name = "CHAPA" as const;

  private getSecretKey(): string {
    const key = process.env.CHAPA_SECRET_KEY;
    if (!key) {
      throw new Error("CHAPA_SECRET_KEY is not configured in server environment variables.");
    }
    return key;
  }

  private getBaseUrl(): string {
    return process.env.CHAPA_BASE_URL || "https://api.chapa.co";
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const secretKey = this.getSecretKey();
    const baseUrl = this.getBaseUrl();
    const txRef = `GH-ORDER-${params.orderId}-${Date.now()}`;

    // Split customer name into first and last name if provided (letters, numbers, spaces only)
    let firstName = "Guest";
    let lastName = `Order ${params.orderId}`;
    if (params.customerName && params.customerName.trim()) {
      const cleanName = params.customerName.replace(/[^a-zA-Z0-9\s]/g, "").trim();
      const parts = cleanName.split(/\s+/).filter(Boolean);
      if (parts.length > 0) {
        firstName = parts[0];
        lastName = parts.slice(1).join(" ") || `Order ${params.orderId}`;
      }
    } else if (params.deliveryLocation) {
      const cleanLoc = params.deliveryLocation.replace(/[^a-zA-Z0-9\s]/g, "").trim();
      if (cleanLoc) firstName = cleanLoc;
    }

    // Ensure email is valid and has a standard accepted domain (Chapa rejects dummy domains like @example.com and non-standard TLDs)
    let email = `guest.order${params.orderId}@goldenhotel.com`;
    if (
      params.customerEmail && 
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(params.customerEmail.trim()) &&
      !params.customerEmail.trim().toLowerCase().endsWith("@example.com")
    ) {
      email = params.customerEmail.trim();
    }

    // Chapa customization description only allows letters, numbers, hyphens, underscores, spaces, and dots (no & or #)
    const payload = {
      amount: params.amount,
      currency: params.currency || "ETB",
      email: email,
      first_name: firstName,
      last_name: lastName,
      tx_ref: txRef,
      return_url: params.returnUrl,
      callback_url: params.callbackUrl,
      customization: {
        title: "Golden Hotel",
        description: `Order ${params.orderId} Food and Beverage`,
      },
    };

    const response = await fetch(`${baseUrl}/v1/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Chapa initialize failed:", response.status, errorText);
      throw new Error(`Chapa payment initialization failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (data.status !== "success" || !data.data?.checkout_url) {
      throw new Error(`Chapa API responded without checkout_url: ${data.message || JSON.stringify(data)}`);
    }

    return {
      provider: "CHAPA",
      providerPaymentId: txRef,
      checkoutUrl: data.data.checkout_url,
      status: "PENDING",
      rawResponse: data,
    };
  }

  async verifyPayment(providerPaymentId: string): Promise<VerifyPaymentResult> {
    const secretKey = this.getSecretKey();
    const baseUrl = this.getBaseUrl();

    const response = await fetch(`${baseUrl}/v1/transaction/verify/${encodeURIComponent(providerPaymentId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Chapa verification request error:", response.status, errorText);
      return {
        provider: "CHAPA",
        providerPaymentId,
        amount: 0,
        currency: "ETB",
        status: "FAILED",
        rawResponse: { error: errorText, status: response.status },
      };
    }

    const data = await response.json();

    const txStatus = data?.data?.status?.toLowerCase();
    let status: "PAID" | "PENDING" | "FAILED" = "PENDING";
    if (data.status === "success" && txStatus === "success") {
      status = "PAID";
    } else if (txStatus === "failed" || data.status === "failed") {
      status = "FAILED";
    }

    return {
      provider: "CHAPA",
      providerPaymentId,
      transactionId: data?.data?.reference || undefined,
      amount: Number(data?.data?.amount) || 0,
      currency: data?.data?.currency || "ETB",
      status,
      rawResponse: data,
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = process.env.CHAPA_WEBHOOK_SECRET || process.env.CHAPA_SECRET_KEY;
    if (!secret || !signature) return false;

    try {
      const expectedSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch (err) {
      console.error("Signature verification error:", err);
      return false;
    }
  }
}

export const chapaProvider = new ChapaProvider();
