import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { paymentService } from "@/lib/payments/service";
import { PaymentMethod, OrderType } from "@/types";
import { APP_CONFIG } from "@/lib/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/orders — list all orders with their items and payment information
export async function GET() {
  try {
    // Fetch all orders with timestamps and delivery fields
    const orders = await sql`
      SELECT 
        id, order_type, delivery_location, 
        delivery_name, delivery_phone, delivery_address, delivery_area, delivery_address_details, delivery_notes, delivery_fee,
        special_instructions, total_amount, status, started_at, ready_at, out_for_delivery_at, delivered_at, created_at
      FROM orders
      ORDER BY created_at DESC
    `;

    // Fetch all order items grouped
    const items = await sql`
      SELECT order_id, menu_item_id, name, price, quantity
      FROM order_items
      ORDER BY id ASC
    `;

    // Fetch all latest payments grouped
    const payments = await sql`
      SELECT DISTINCT ON (order_id)
        id, order_id, amount, currency, method, status, provider, 
        provider_payment_id, transaction_id, checkout_url, paid_at, paid_by_email, created_at
      FROM payments
      ORDER BY order_id, id DESC
    `;

    // Map items to orders
    const itemsByOrder: Record<number, typeof items> = {};
    for (const item of items) {
      const oid = item.order_id as number;
      if (!itemsByOrder[oid]) itemsByOrder[oid] = [];
      itemsByOrder[oid].push(item);
    }

    // Map payments to orders
    const paymentsByOrder: Record<number, (typeof payments)[0]> = {};
    for (const p of payments) {
      paymentsByOrder[p.order_id as number] = p;
    }

    const result = orders.map((order) => {
      const payment = paymentsByOrder[order.id as number] || null;
      // Map legacy "in-progress" to "cooking"
      let normalizedStatus = order.status;
      if (normalizedStatus === "in-progress") normalizedStatus = "cooking";

      return {
        id: order.id,
        order_type: (order.order_type as OrderType) || "HOTEL",
        delivery_location: order.delivery_location,
        delivery_name: order.delivery_name,
        delivery_phone: order.delivery_phone,
        delivery_address: order.delivery_address,
        delivery_area: order.delivery_area,
        delivery_address_details: order.delivery_address_details,
        delivery_notes: order.delivery_notes,
        delivery_fee: Number(order.delivery_fee || 0),
        special_instructions: order.special_instructions,
        total_amount: Number(order.total_amount),
        status: normalizedStatus,
        started_at: order.started_at,
        ready_at: order.ready_at,
        out_for_delivery_at: order.out_for_delivery_at,
        delivered_at: order.delivered_at,
        created_at: order.created_at,
        items: (itemsByOrder[order.id as number] || []).map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: Number(i.price),
          menu_item_id: i.menu_item_id,
        })),
        payment: payment
          ? {
            id: payment.id,
            order_id: payment.order_id,
            amount: Number(payment.amount),
            currency: payment.currency,
            method: payment.method,
            status: payment.status,
            provider: payment.provider,
            provider_payment_id: payment.provider_payment_id,
            transaction_id: payment.transaction_id,
            checkout_url: payment.checkout_url,
            paid_at: payment.paid_at,
            paid_by_email: payment.paid_by_email,
          }
          : null,
        payment_status: payment?.status || "UNPAID",
        payment_method: payment?.method || "CASH",
        paid_at: payment?.paid_at || null,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET orders error:", error);
    return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });
  }
}

// POST /api/orders — create a new order with items and associated payment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      order_type = "HOTEL",
      delivery_location,
      delivery_name,
      delivery_phone,
      delivery_address,
      delivery_area,
      delivery_address_details,
      delivery_notes,
      special_instructions,
      items,
      payment_method,
      customer_email,
      customer_name,
      return_url,
    } = body;

    const validatedOrderType: OrderType = order_type === "DELIVERY" ? "DELIVERY" : "HOTEL";

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Order must contain at least one item." },
        { status: 400 }
      );
    }

    // Validation according to order_type
    let finalLocation = "";

    if (validatedOrderType === "HOTEL") {
      if (!delivery_location || typeof delivery_location !== "string" || !delivery_location.trim()) {
        return NextResponse.json(
          { error: "Please provide your table or room number." },
          { status: 400 }
        );
      }
      finalLocation = delivery_location.trim();
    } else {
      // Home Delivery validations
      if (!delivery_name || typeof delivery_name !== "string" || !delivery_name.trim()) {
        return NextResponse.json({ error: "Customer full name is required for delivery." }, { status: 400 });
      }
      if (!delivery_phone || typeof delivery_phone !== "string" || !delivery_phone.trim()) {
        return NextResponse.json({ error: "Phone number is required for delivery." }, { status: 400 });
      }
      if (!delivery_address || typeof delivery_address !== "string" || !delivery_address.trim()) {
        return NextResponse.json({ error: "Delivery address is required." }, { status: 400 });
      }
      finalLocation = delivery_address.trim() + (delivery_area?.trim() ? `, ${delivery_area.trim()}` : "");
    }

    // Server-side trusted pricing: fetch real menu item prices from database
    const menuItemIds = items.map((i: { menu_item_id?: number }) => i.menu_item_id).filter(Boolean);
    const dbMenuItems = menuItemIds.length > 0
      ? await sql`SELECT id, name, price FROM menu_items WHERE id = ANY(${menuItemIds})`
      : [];

    const dbPriceMap = new Map<number, { name: string; price: number }>();
    for (const d of dbMenuItems) {
      dbPriceMap.set(d.id, { name: d.name, price: Number(d.price) });
    }

    let itemsTotal = 0;
    const verifiedItems = items.map((item: { menu_item_id?: number; name?: string; price?: number; quantity: number }) => {
      const dbItem = item.menu_item_id ? dbPriceMap.get(item.menu_item_id) : null;
      const price = dbItem ? dbItem.price : Number(item.price || 0);
      const name = dbItem ? dbItem.name : item.name || "Menu Item";
      const quantity = Math.max(1, parseInt(String(item.quantity), 10) || 1);
      itemsTotal += price * quantity;
      return {
        menu_item_id: item.menu_item_id || null,
        name,
        price,
        quantity,
      };
    });

    const deliveryFee = validatedOrderType === "DELIVERY" ? APP_CONFIG.DELIVERY_FEE : 0;
    const trustedTotal = itemsTotal + deliveryFee;

    // Insert the order with initial status 'new' and trusted total
    const orderRows = await sql`
      INSERT INTO orders (
        order_type, delivery_location, delivery_name, delivery_phone,
        delivery_address, delivery_area, delivery_address_details, delivery_notes,
        delivery_fee, special_instructions, total_amount, status
      )
      VALUES (
        ${validatedOrderType}, ${finalLocation}, ${delivery_name ? delivery_name.trim() : null}, ${delivery_phone ? delivery_phone.trim() : null},
        ${delivery_address ? delivery_address.trim() : null}, ${delivery_area ? delivery_area.trim() : null},
        ${delivery_address_details ? delivery_address_details.trim() : null}, ${delivery_notes ? delivery_notes.trim() : null},
        ${deliveryFee}, ${special_instructions ? special_instructions.trim() : ""}, ${trustedTotal}, 'new'
      )
      RETURNING id, order_type, delivery_location, delivery_name, delivery_phone,
                delivery_address, delivery_area, delivery_address_details, delivery_notes,
                delivery_fee, special_instructions, total_amount, status, created_at
    `;

    const order = orderRows[0];

    // Insert order items with trusted prices
    for (const item of verifiedItems) {
      await sql`
        INSERT INTO order_items (order_id, menu_item_id, name, price, quantity)
        VALUES (${order.id}, ${item.menu_item_id}, ${item.name}, ${item.price}, ${item.quantity})
      `;
    }

    // Automatically create payment record (Cash UNPAID or Digital PENDING)
    const selectedMethod: PaymentMethod = payment_method === "DIGITAL" ? "DIGITAL" : "CASH";
    const guestPayerName = validatedOrderType === "DELIVERY"
      ? (delivery_name ? delivery_name.trim() : "Delivery Customer")
      : (customer_name || finalLocation);

    // Build return URL ensuring order_id and payment=success are attached
    let returnUrlWithOrderId = return_url;
    if (returnUrlWithOrderId && typeof returnUrlWithOrderId === "string") {
      try {
        const u = new URL(returnUrlWithOrderId, "http://localhost:3000");
        u.searchParams.set("order_id", String(order.id));
        if (!u.searchParams.has("payment")) {
          u.searchParams.set("payment", "success");
        }
        returnUrlWithOrderId = u.toString();
      } catch {
        returnUrlWithOrderId = undefined;
      }
    }

    let paymentResult;
    try {
      paymentResult = await paymentService.createPayment({
        orderId: order.id,
        method: selectedMethod,
        customerEmail: customer_email,
        customerName: guestPayerName,
        returnUrl: returnUrlWithOrderId,
      });
    } catch (paymentErr) {
      console.error("Order payment creation error:", paymentErr);
      if (selectedMethod === "DIGITAL") {
        // Delete the unconfirmed order so user isn't stuck with an unintended cash order
        await sql`DELETE FROM orders WHERE id = ${order.id}`;
        const errMsg = paymentErr instanceof Error ? paymentErr.message : "Payment initialization failed.";
        const isEnvError = errMsg.includes("CHAPA_SECRET_KEY");
        return NextResponse.json(
          {
            error: isEnvError
              ? "Payment Gateway Error: CHAPA_SECRET_KEY is missing in your Vercel Environment Variables. Please add it to your Vercel project settings."
              : `Digital payment initialization failed: ${errMsg}`
          },
          { status: 502 }
        );
      }
      paymentResult = await paymentService.createPayment({
        orderId: order.id,
        method: "CASH",
      });
    }

    return NextResponse.json(
      {
        id: order.id,
        order_type: order.order_type,
        delivery_location: order.delivery_location,
        delivery_name: order.delivery_name,
        delivery_phone: order.delivery_phone,
        delivery_address: order.delivery_address,
        delivery_area: order.delivery_area,
        delivery_address_details: order.delivery_address_details,
        delivery_notes: order.delivery_notes,
        delivery_fee: Number(order.delivery_fee),
        special_instructions: order.special_instructions,
        total_amount: Number(order.total_amount),
        status: "new",
        created_at: order.created_at,
        items: verifiedItems,
        payment: paymentResult.payment,
        payment_status: paymentResult.payment.status,
        payment_method: paymentResult.payment.method,
        checkout_url: paymentResult.checkoutUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST orders error:", error);
    return NextResponse.json({ error: "Failed to create order." }, { status: 500 });
  }
}
