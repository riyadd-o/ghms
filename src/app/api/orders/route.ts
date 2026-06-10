import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

// GET /api/orders — list all orders with their items
export async function GET() {
  try {
    // Fetch all orders
    const orders = await sql`
      SELECT id, delivery_location, special_instructions, total_amount, status, created_at
      FROM orders
      ORDER BY created_at DESC
    `;

    // Fetch all order items grouped
    const items = await sql`
      SELECT order_id, menu_item_id, name, price, quantity
      FROM order_items
      ORDER BY id ASC
    `;

    // Map items to orders
    const itemsByOrder: Record<number, typeof items> = {};
    for (const item of items) {
      const oid = item.order_id as number;
      if (!itemsByOrder[oid]) itemsByOrder[oid] = [];
      itemsByOrder[oid].push(item);
    }

    const result = orders.map((order) => ({
      id: order.id,
      delivery_location: order.delivery_location,
      special_instructions: order.special_instructions,
      total_amount: Number(order.total_amount),
      status: order.status,
      created_at: order.created_at,
      items: (itemsByOrder[order.id as number] || []).map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: Number(i.price),
        menu_item_id: i.menu_item_id,
      })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET orders error:", error);
    return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });
  }
}

// POST /api/orders — create a new order with items
export async function POST(req: NextRequest) {
  try {
    const { delivery_location, special_instructions, total_amount, items } = await req.json();

    if (!delivery_location || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Delivery location and items are required." },
        { status: 400 }
      );
    }

    // Insert the order
    const orderRows = await sql`
      INSERT INTO orders (delivery_location, special_instructions, total_amount, status)
      VALUES (${delivery_location}, ${special_instructions || ""}, ${total_amount}, 'new')
      RETURNING id, delivery_location, special_instructions, total_amount, status, created_at
    `;

    const order = orderRows[0];

    // Insert order items sequentially
    for (const item of items) {
      await sql`
        INSERT INTO order_items (order_id, menu_item_id, name, price, quantity)
        VALUES (${order.id}, ${item.menu_item_id || null}, ${item.name}, ${item.price}, ${item.quantity})
      `;
    }

    return NextResponse.json(
      {
        id: order.id,
        delivery_location: order.delivery_location,
        special_instructions: order.special_instructions,
        total_amount: Number(order.total_amount),
        status: order.status,
        created_at: order.created_at,
        items,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST orders error:", error);
    return NextResponse.json({ error: "Failed to create order." }, { status: 500 });
  }
}
