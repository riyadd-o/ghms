import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import sql from "@/lib/db";

// PUT /api/menu-items/reorder — reorder menu items
export async function PUT(req: NextRequest) {
  try {
    const { ids } = await req.json();

    if (!Array.isArray(ids)) {
      return NextResponse.json({ error: "Invalid data format. Expected array of IDs." }, { status: 400 });
    }

    // Execute an UPDATE query for each ID to save its new sort_order
    for (let i = 0; i < ids.length; i++) {
      await sql`UPDATE menu_items SET sort_order = ${i} WHERE id = ${ids[i]}`;
    }

    revalidatePath('/');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT menu-items/reorder error:", error);
    return NextResponse.json({ error: "Failed to reorder items." }, { status: 500 });
  }
}
