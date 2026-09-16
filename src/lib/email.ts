import nodemailer from "nodemailer";
import sql from "@/lib/db";

export async function sendOrderReceiptEmail(orderId: number): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const orders = await sql`
      SELECT id, delivery_location, special_instructions, total_amount, status, created_at
      FROM orders
      WHERE id = ${orderId}
    `;

    if (orders.length === 0) {
      return { success: false, error: "Order not found." };
    }

    const order = orders[0];

    const items = await sql`
      SELECT name, price, quantity
      FROM order_items
      WHERE order_id = ${orderId}
      ORDER BY id ASC
    `;

    const payments = await sql`
      SELECT id, amount, currency, method, status, provider, transaction_id, provider_payment_id, paid_by_email, metadata, paid_at
      FROM payments
      WHERE order_id = ${orderId}
      ORDER BY id DESC
      LIMIT 1
    `;

    const payment = payments[0];
    const recipientEmail = payment?.paid_by_email;

    if (!recipientEmail || !recipientEmail.includes("@")) {
      console.log(`[Email] No valid customer email for order #${orderId}. Skipping receipt email.`);
      return { success: false, error: "No recipient email." };
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPass) {
      console.warn("[Email] GMAIL_USER or GMAIL_APP_PASSWORD not set in environment.");
      return { success: false, error: "SMTP not configured." };
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    const customerName = (payment?.metadata as { customer_name?: string })?.customer_name || "Valued Guest";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const trackingUrl = `${baseUrl}/cart?order_id=${orderId}`;

    const itemsHtml = items.map((it) => `
      <tr>
        <td style="padding: 8px 0; color: #cbd5e1; border-bottom: 1px solid rgba(212,175,55,0.1);">${it.name}</td>
        <td style="padding: 8px 0; text-align: center; color: #94a3b8; border-bottom: 1px solid rgba(212,175,55,0.1);">${it.quantity} &times;</td>
        <td style="padding: 8px 0; text-align: right; color: #d4af37; font-weight: bold; border-bottom: 1px solid rgba(212,175,55,0.1);">ETB ${(Number(it.price) * Number(it.quantity)).toFixed(2)}</td>
      </tr>
    `).join("");

    const paymentMethodLabel = payment?.method === "DIGITAL" 
      ? `Digital Payment (${payment.provider || "Chapa"})` 
      : "Cash on Delivery";

    const mailOptions = {
      from: `"Golden Hotel" <${gmailUser}>`,
      to: recipientEmail,
      subject: `Golden Hotel - Order #${orderId} Payment Receipt`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Golden Hotel Receipt</title>
        </head>
        <body style="margin: 0; padding: 24px; background-color: #030a06; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #07170f; border: 1px solid rgba(212,175,55,0.3); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0d2619 0%, #06110b 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid rgba(212,175,55,0.25);">
              <div style="font-size: 32px; margin-bottom: 8px;">👑</div>
              <h1 style="margin: 0; color: #d4af37; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;">Golden Hotel</h1>
              <p style="margin: 6px 0 0 0; color: #a1b8aa; font-size: 11px; letter-spacing: 3px; text-transform: uppercase;">Official Payment Receipt &amp; Order Confirmation</p>
            </div>

            <!-- Content -->
            <div style="padding: 28px 24px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #f1f5f9;">Dear <strong>${customerName}</strong>,</p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
                Thank you for your order. Your payment has been successfully received and verified. Our culinary team is currently preparing your meal.
              </p>

              <!-- Order & Payment Info Box -->
              <div style="background-color: #0b1f15; border: 1px solid rgba(212,175,55,0.2); border-radius: 8px; padding: 18px; margin-bottom: 24px;">
                <table style="width: 100%; font-size: 13px; color: #cbd5e1; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 5px 0; color: #94a3b8;">Order Number:</td>
                    <td style="padding: 5px 0; text-align: right; font-weight: bold; color: #d4af37;">#${orderId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #94a3b8;">Delivery Location:</td>
                    <td style="padding: 5px 0; text-align: right; font-weight: bold; color: #ffffff;">${order.delivery_location}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #94a3b8;">Payment Method:</td>
                    <td style="padding: 5px 0; text-align: right; font-weight: bold; color: #ffffff;">${paymentMethodLabel}</td>
                  </tr>
                  ${payment?.transaction_id ? `
                  <tr>
                    <td style="padding: 5px 0; color: #94a3b8;">Transaction ID:</td>
                    <td style="padding: 5px 0; text-align: right; font-family: monospace; font-size: 11px; color: #a1b8aa;">${payment.transaction_id}</td>
                  </tr>` : ""}
                  <tr>
                    <td style="padding: 5px 0; color: #94a3b8;">Payment Status:</td>
                    <td style="padding: 5px 0; text-align: right; font-weight: bold; color: #4ade80;">PAID &amp; VERIFIED</td>
                  </tr>
                </table>
              </div>

              <!-- Itemized Food List -->
              <h3 style="margin: 0 0 12px 0; font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; color: #d4af37;">Your Selection</h3>
              <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                  <tr style="border-bottom: 1px solid rgba(212,175,55,0.2);">
                    <th style="padding: 6px 0; text-align: left; font-size: 11px; color: #94a3b8; text-transform: uppercase;">Item</th>
                    <th style="padding: 6px 0; text-align: center; font-size: 11px; color: #94a3b8; text-transform: uppercase;">Qty</th>
                    <th style="padding: 6px 0; text-align: right; font-size: 11px; color: #94a3b8; text-transform: uppercase;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr>
                    <td colspan="2" style="padding: 12px 0 0 0; color: #ffffff; font-weight: bold; font-size: 15px;">Total Paid</td>
                    <td style="padding: 12px 0 0 0; text-align: right; color: #d4af37; font-weight: bold; font-size: 18px;">ETB ${Number(order.total_amount).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Track Live Button -->
              <div style="text-align: center; margin: 32px 0 16px 0;">
                <a href="${trackingUrl}" style="display: inline-block; background-color: #d4af37; color: #07170f; font-weight: bold; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; text-decoration: none; padding: 14px 32px; border-radius: 6px; box-shadow: 0 4px 15px rgba(212,175,55,0.3);">
                  Track Order Preparation Live
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #040e09; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid rgba(212,175,55,0.1);">
              Golden Hotel &bull; Addis Ababa, Ethiopia &bull; In-Room Dining &amp; Restaurant Operations
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Receipt sent to ${recipientEmail} for Order #${orderId} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] Failed to send receipt for order #${orderId}:`, error);
    return { success: false, error: (error as Error).message };
  }
}
