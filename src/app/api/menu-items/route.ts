import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import sql from "@/lib/db";

// GET /api/menu-items — list all items with category name
export async function GET() {
  try {
    const rows = await sql`
      SELECT 
        mi.id,
        mi.name,
        mi.description,
        mi.price,
        mi.category_id,
        COALESCE(c.name, 'Uncategorized') AS category,
        mi.image_base64 AS image,
        mi.available,
        mi.created_at
      FROM menu_items mi
      LEFT JOIN categories c ON mi.category_id = c.id
      ORDER BY mi.sort_order ASC, mi.created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET menu-items error:", error);
    return NextResponse.json({ error: "Failed to fetch menu items." }, { status: 500 });
  }
}

// POST /api/menu-items — create a new menu item
export async function POST(req: NextRequest) {
  try {
    const { name, description, price, category_id, image, available } = await req.json();

    if (!name || price == null) {
      return NextResponse.json({ error: "Name and price are required." }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO menu_items (name, description, price, category_id, image_base64, available)
      VALUES (${name}, ${description || ""}, ${price}, ${category_id || null}, ${image || ""}, ${available !== false})
      RETURNING id
    `;

    revalidatePath('/');
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (error) {
    console.error("POST menu-items error:", error);
    return NextResponse.json({ error: "Failed to create menu item." }, { status: 500 });
  }
}
