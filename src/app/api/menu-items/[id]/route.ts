import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import sql from "@/lib/db";

// PUT /api/menu-items/[id] — update a menu item
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);

    if (isNaN(itemId)) {
      return NextResponse.json({ error: "Invalid item ID." }, { status: 400 });
    }

    const { name, description, price, category_id, image, available } = await req.json();

    const rows = await sql`
      UPDATE menu_items 
      SET name = ${name}, 
          description = ${description || ""},
          price = ${price},
          category_id = ${category_id || null},
          image_base64 = ${image || ""},
          available = ${available !== false}
      WHERE id = ${itemId}
      RETURNING id
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    revalidatePath('/');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT menu-item error:", error);
    return NextResponse.json({ error: "Failed to update menu item." }, { status: 500 });
  }
}

// DELETE /api/menu-items/[id] — delete a menu item
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);

    if (isNaN(itemId)) {
      return NextResponse.json({ error: "Invalid item ID." }, { status: 400 });
    }

    const rows = await sql`DELETE FROM menu_items WHERE id = ${itemId} RETURNING id`;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    revalidatePath('/');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE menu-item error:", error);
    return NextResponse.json({ error: "Failed to delete menu item." }, { status: 500 });
  }
}
