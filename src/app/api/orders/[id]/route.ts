import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

// GET /api/orders/[id] — fetch a single order with its items and payment status
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id, 10);

    if (isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
    }

    const orders = await sql`
      SELECT 
        id, order_type, delivery_location,
        delivery_name, delivery_phone, delivery_address, delivery_area, delivery_address_details, delivery_notes, delivery_fee,
        special_instructions, total_amount, status, started_at, ready_at, out_for_delivery_at, delivered_at, created_at
      FROM orders WHERE id = ${orderId}
    `;

    if (orders.length === 0) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const order = orders[0];
    const items = await sql`
      SELECT menu_item_id, name, price, quantity FROM order_items WHERE order_id = ${orderId} ORDER BY id ASC
    `;

    const payments = await sql`
      SELECT id, order_id, amount, currency, method, status, provider, 
             provider_payment_id, transaction_id, checkout_url, paid_at, paid_by_email, created_at
      FROM payments WHERE order_id = ${orderId} ORDER BY id DESC LIMIT 1
    `;
    const payment = payments[0] || null;

    let normalizedStatus = order.status;
    if (normalizedStatus === "in-progress") normalizedStatus = "cooking";

    return NextResponse.json({
      id: order.id,
      order_type: order.order_type || "HOTEL",
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
      items: items.map((i) => ({
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
        }
        : null,
      payment_status: payment?.status || "UNPAID",
      payment_method: payment?.method || "CASH",
      paid_at: payment?.paid_at || null,
    });
  } catch (error) {
    console.error("GET order error:", error);
    return NextResponse.json({ error: "Failed to fetch order." }, { status: 500 });
  }
}

// PATCH /api/orders/[id] — update order status (food workflow: new -> cooking -> ready -> out_for_delivery -> delivered)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id, 10);

    if (isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
    }

    const { status } = await req.json();

    const validStatuses = ["new", "cooking", "ready", "out_for_delivery", "delivered", "in-progress"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    let normalizedStatus = status;
    if (normalizedStatus === "in-progress") normalizedStatus = "cooking";

    // Set appropriate timestamps based on new status
    let rows;
    if (normalizedStatus === "cooking") {
      rows = await sql`
        UPDATE orders 
        SET status = ${normalizedStatus}, started_at = COALESCE(started_at, NOW())
        WHERE id = ${orderId} 
        RETURNING id, status, started_at, ready_at, out_for_delivery_at, delivered_at
      `;
    } else if (normalizedStatus === "ready") {
      rows = await sql`
        UPDATE orders 
        SET status = ${normalizedStatus}, ready_at = COALESCE(ready_at, NOW())
        WHERE id = ${orderId} 
        RETURNING id, status, started_at, ready_at, out_for_delivery_at, delivered_at
      `;
    } else if (normalizedStatus === "out_for_delivery") {
      rows = await sql`
        UPDATE orders 
        SET status = ${normalizedStatus}, out_for_delivery_at = COALESCE(out_for_delivery_at, NOW())
        WHERE id = ${orderId} 
        RETURNING id, status, started_at, ready_at, out_for_delivery_at, delivered_at
      `;
    } else if (normalizedStatus === "delivered") {
      rows = await sql`
        UPDATE orders 
        SET status = ${normalizedStatus}, delivered_at = COALESCE(delivered_at, NOW())
        WHERE id = ${orderId} 
        RETURNING id, status, started_at, ready_at, out_for_delivery_at, delivered_at
      `;
    } else {
      rows = await sql`
        UPDATE orders 
        SET status = ${normalizedStatus}
        WHERE id = ${orderId} 
        RETURNING id, status, started_at, ready_at, out_for_delivery_at, delivered_at
      `;
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("PATCH order error:", error);
    return NextResponse.json({ error: "Failed to update order status." }, { status: 500 });
  }
}
