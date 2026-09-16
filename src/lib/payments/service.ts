import sql from "@/lib/db";
import { getDigitalPaymentProvider } from "./index";
import { Payment, PaymentMethod, PaymentStatus } from "@/types";

export interface CreatePaymentOptions {
  orderId: number;
  method: PaymentMethod;
  customerEmail?: string;
  customerName?: string;
  returnUrl?: string;
  callbackUrl?: string;
}

export interface PaymentStats {
  totalRevenue: number;
  cashRevenue: number;
  digitalRevenue: number;
  outstandingRevenue: number;
  totalOrders: number;
  paidOrdersCount: number;
  unpaidOrdersCount: number;
  pendingOrdersCount: number;
}

export class PaymentService {
  /**
   * Creates or initializes a payment for an existing order.
   * Derives the exact amount directly from the trusted database order record.
   */
  async createPayment(options: CreatePaymentOptions) {
    const { orderId, method } = options;

    // 1. Fetch order directly from Neon to verify existence & calculate verified amount
    const orderRows = await sql`
      SELECT id, delivery_location, total_amount, status, created_at
      FROM orders
      WHERE id = ${orderId}
    `;

    if (orderRows.length === 0) {
      throw new Error(`Order #${orderId} not found.`);
    }

    const order = orderRows[0];
    const orderTotal = Number(order.total_amount);

    // 2. Check if a payment record already exists
    const existingPayments = await sql`
      SELECT * FROM payments WHERE order_id = ${orderId} ORDER BY id DESC LIMIT 1
    `;

    const existingPayment = existingPayments[0] as Payment | undefined;

    // Never overwrite an already PAID payment
    if (existingPayment && existingPayment.status === "PAID") {
      return {
        payment: existingPayment,
        checkoutUrl: null,
        alreadyPaid: true,
      };
    }

    if (method === "CASH") {
      let paymentRecord: Payment;

      if (existingPayment && existingPayment.method === "CASH") {
        // Reuse existing cash payment record
        const updated = await sql`
          UPDATE payments
          SET status = 'UNPAID', amount = ${orderTotal}, updated_at = NOW()
          WHERE id = ${existingPayment.id}
          RETURNING *
        `;
        paymentRecord = updated[0] as Payment;
      } else {
        const inserted = await sql`
          INSERT INTO payments (order_id, amount, currency, method, status, provider, created_at, updated_at)
          VALUES (${orderId}, ${orderTotal}, 'ETB', 'CASH', 'UNPAID', NULL, NOW(), NOW())
          RETURNING *
        `;
        paymentRecord = inserted[0] as Payment;
      }

      return {
        payment: paymentRecord,
        checkoutUrl: null,
        alreadyPaid: false,
      };
    }

    // DIGITAL PAYMENT FLOW (Chapa)
    const provider = getDigitalPaymentProvider();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const returnUrl = options.returnUrl || `${baseUrl}/cart?order_id=${orderId}&payment=success`;
    const callbackUrl = options.callbackUrl || `${baseUrl}/api/payments/webhook`;

    const initResult = await provider.initializePayment({
      orderId,
      amount: orderTotal,
      currency: "ETB",
      customerEmail: options.customerEmail,
      customerName: options.customerName,
      deliveryLocation: order.delivery_location,
      returnUrl,
      callbackUrl,
    });

    let paymentRecord: Payment;
    if (existingPayment) {
      const customerMetadata = JSON.stringify({
        customer_name: options.customerName || null,
        guest_location: order.delivery_location,
      });

      const updated = await sql`
        UPDATE payments
        SET 
          method = 'DIGITAL',
          status = 'PENDING',
          provider = ${provider.name},
          provider_payment_id = ${initResult.providerPaymentId},
          checkout_url = ${initResult.checkoutUrl},
          amount = ${orderTotal},
          paid_by_email = ${options.customerEmail || null},
          metadata = ${customerMetadata}::jsonb,
          updated_at = NOW()
        WHERE id = ${existingPayment.id}
        RETURNING *
      `;
      paymentRecord = updated[0] as Payment;
    } else {
      const customerMetadata = JSON.stringify({
        customer_name: options.customerName || null,
        guest_location: order.delivery_location,
      });

      const inserted = await sql`
        INSERT INTO payments (
          order_id, amount, currency, method, status, provider, provider_payment_id, checkout_url, paid_by_email, metadata, created_at, updated_at
        ) VALUES (
          ${orderId}, ${orderTotal}, 'ETB', 'DIGITAL', 'PENDING', ${provider.name}, ${initResult.providerPaymentId}, ${initResult.checkoutUrl}, ${options.customerEmail || null}, ${customerMetadata}::jsonb, NOW(), NOW()
        )
        RETURNING *
      `;
      paymentRecord = inserted[0] as Payment;
    }

    return {
      payment: paymentRecord,
      checkoutUrl: initResult.checkoutUrl,
      alreadyPaid: false,
    };
  }

  /**
   * Verifies digital payment directly with the provider (server-side verification).
   * Ensures idempotency: will not double-count revenue if already marked PAID.
   */
  async verifyPayment(orderId: number, txRef?: string) {
    // 1. Locate payment record
    let paymentRows;
    if (txRef) {
      paymentRows = await sql`
        SELECT * FROM payments WHERE order_id = ${orderId} AND provider_payment_id = ${txRef}
      `;
    } else {
      paymentRows = await sql`
        SELECT * FROM payments WHERE order_id = ${orderId} ORDER BY id DESC LIMIT 1
      `;
    }

    if (paymentRows.length === 0) {
      throw new Error(`No payment record found for Order #${orderId}.`);
    }

    const payment = paymentRows[0] as Payment;

    // Idempotent: If already PAID, do not reprocess
    if (payment.status === "PAID") {
      return { payment, verified: true, status: "PAID" as PaymentStatus };
    }

    if (!payment.provider_payment_id) {
      return { payment, verified: false, status: payment.status };
    }

    // 2. Query payment provider directly
    const provider = getDigitalPaymentProvider();
    const verifyResult = await provider.verifyPayment(payment.provider_payment_id);

    if (verifyResult.status === "PAID") {
      const updated = await sql`
        UPDATE payments
        SET 
          status = 'PAID',
          transaction_id = ${verifyResult.transactionId || null},
          paid_at = NOW(),
          updated_at = NOW()
        WHERE id = ${payment.id}
        RETURNING *
      `;

      return {
        payment: updated[0] as Payment,
        verified: true,
        status: "PAID" as PaymentStatus,
      };
    } else if (verifyResult.status === "FAILED") {
      const updated = await sql`
        UPDATE payments
        SET status = 'FAILED', updated_at = NOW()
        WHERE id = ${payment.id}
        RETURNING *
      `;
      return {
        payment: updated[0] as Payment,
        verified: false,
        status: "FAILED" as PaymentStatus,
      };
    }

    return {
      payment,
      verified: false,
      status: payment.status,
    };
  }

  /**
   * Staff action: confirm cash payment upon food delivery or cashier settlement.
   * Records staff identity and exact timestamp.
   */
  async confirmCashPayment(orderId: number, staffId: number, staffEmail: string) {
    const paymentRows = await sql`
      SELECT * FROM payments WHERE order_id = ${orderId} ORDER BY id DESC LIMIT 1
    `;

    if (paymentRows.length === 0) {
      throw new Error(`Payment record for Order #${orderId} not found.`);
    }

    const payment = paymentRows[0] as Payment;

    if (payment.status === "PAID") {
      return payment;
    }

    const updated = await sql`
      UPDATE payments
      SET 
        status = 'PAID',
        method = 'CASH',
        paid_at = NOW(),
        paid_by = ${staffId},
        paid_by_email = ${staffEmail},
        updated_at = NOW()
      WHERE id = ${payment.id}
      RETURNING *
    `;

    return updated[0] as Payment;
  }

  /**
   * Webhook handler for asynchronous payment gateway notifications.
   * Idempotently verifies and updates payment.
   */
  async handleWebhook(rawBody: string, signature?: string) {
    const provider = getDigitalPaymentProvider();

    // Verify signature if provided
    if (signature && !provider.verifyWebhookSignature(rawBody, signature)) {
      throw new Error("Invalid webhook signature.");
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new Error("Malformed webhook JSON payload.");
    }

    // Chapa sends { tx_ref, status, ... }
    const txRef = (payload.tx_ref as string) || (payload.reference as string);
    if (!txRef) {
      return { received: true, message: "No tx_ref in webhook body." };
    }

    // Find payment with this tx_ref
    const paymentRows = await sql`
      SELECT * FROM payments WHERE provider_payment_id = ${txRef}
    `;

    if (paymentRows.length === 0) {
      return { received: true, message: "No matching payment record for this reference." };
    }

    const payment = paymentRows[0] as Payment;

    // Idempotent: If already PAID, ignore duplicate webhook without error or duplicate revenue
    if (payment.status === "PAID") {
      return { received: true, message: "Payment already settled as PAID." };
    }

    // Always perform server-side verification with provider for security
    const verifyResult = await provider.verifyPayment(txRef);

    if (verifyResult.status === "PAID") {
      await sql`
        UPDATE payments
        SET 
          status = 'PAID',
          transaction_id = ${verifyResult.transactionId || null},
          paid_at = NOW(),
          updated_at = NOW()
        WHERE id = ${payment.id}
      `;
    } else if (verifyResult.status === "FAILED") {
      await sql`
        UPDATE payments
        SET status = 'FAILED', updated_at = NOW()
        WHERE id = ${payment.id}
      `;
    }

    return { received: true, status: verifyResult.status };
  }

  /**
   * Calculates dashboard payment KPIs:
   * Revenue is strictly from PAID payments. Unpaid delivered orders are tracked as Outstanding.
   */
  async getPaymentStats(): Promise<PaymentStats> {
    const totals = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'PAID' AND method = 'CASH' THEN amount ELSE 0 END), 0) as cash_revenue,
        COALESCE(SUM(CASE WHEN status = 'PAID' AND method = 'DIGITAL' THEN amount ELSE 0 END), 0) as digital_revenue,
        COALESCE(SUM(CASE WHEN status IN ('UNPAID', 'PENDING') THEN amount ELSE 0 END), 0) as outstanding_revenue,
        COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'UNPAID' THEN 1 END) as unpaid_count,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
        COUNT(*) as total_payments
      FROM payments
    `;

    const orderCountRows = await sql`
      SELECT COUNT(*) as total_orders FROM orders
    `;

    const row = totals[0];
    const orderCount = Number(orderCountRows[0]?.total_orders || 0);

    return {
      totalRevenue: Number(row.total_revenue || 0),
      cashRevenue: Number(row.cash_revenue || 0),
      digitalRevenue: Number(row.digital_revenue || 0),
      outstandingRevenue: Number(row.outstanding_revenue || 0),
      totalOrders: orderCount,
      paidOrdersCount: Number(row.paid_count || 0),
      unpaidOrdersCount: Number(row.unpaid_count || 0),
      pendingOrdersCount: Number(row.pending_count || 0),
    };
  }

  /**
   * Retrieves payments for the admin payments view with optional filtering and order details.
   */
  async listPayments(filters?: {
    status?: string;
    method?: string;
    search?: string;
    date?: string;
  }) {
    const payments = await sql`
      SELECT 
        p.*,
        o.delivery_location,
        o.status as order_status
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      ORDER BY p.created_at DESC
    `;

    return payments.filter((p) => {
      if (filters?.status && filters.status !== "ALL" && p.status !== filters.status) {
        return false;
      }
      if (filters?.method && filters.method !== "ALL" && p.method !== filters.method) {
        return false;
      }
      if (filters?.date) {
        const pDate = new Date(p.created_at).toISOString().split("T")[0];
        if (pDate !== filters.date) return false;
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        const matchesId = String(p.order_id).includes(q);
        const matchesTx = (p.provider_payment_id || "").toLowerCase().includes(q) || (p.transaction_id || "").toLowerCase().includes(q);
        const matchesLocation = (p.delivery_location || "").toLowerCase().includes(q);
        if (!matchesId && !matchesTx && !matchesLocation) return false;
      }
      return true;
    });
  }
}

export const paymentService = new PaymentService();
