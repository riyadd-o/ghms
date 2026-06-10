import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

// GET /api/orders/[id] — fetch a single order with its items
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
      SELECT id, delivery_location, special_instructions, total_amount, status, created_at
      FROM orders WHERE id = ${orderId}
    `;

    if (orders.length === 0) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const order = orders[0];
    const items = await sql`
      SELECT menu_item_id, name, price, quantity FROM order_items WHERE order_id = ${orderId} ORDER BY id ASC
    `;

    return NextResponse.json({
      id: order.id,
      delivery_location: order.delivery_location,
      special_instructions: order.special_instructions,
      total_amount: Number(order.total_amount),
      status: order.status,
      created_at: order.created_at,
      items: items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: Number(i.price),
        menu_item_id: i.menu_item_id,
      })),
    });
  } catch (error) {
    console.error("GET order error:", error);
    return NextResponse.json({ error: "Failed to fetch order." }, { status: 500 });
  }
}

// PATCH /api/orders/[id] — update order status
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

    const validStatuses = ["new", "in-progress", "delivered"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const rows = await sql`
      UPDATE orders SET status = ${status} WHERE id = ${orderId} RETURNING id, status
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({ id: rows[0].id, status: rows[0].status });
  } catch (error) {
    console.error("PATCH order error:", error);
    return NextResponse.json({ error: "Failed to update order status." }, { status: 500 });
  }
}
