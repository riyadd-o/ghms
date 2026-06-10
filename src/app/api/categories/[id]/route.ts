import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import sql from "@/lib/db";

// DELETE /api/categories/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const categoryId = parseInt(id, 10);

    if (isNaN(categoryId)) {
      return NextResponse.json({ error: "Invalid category ID." }, { status: 400 });
    }

    const rows = await sql`DELETE FROM categories WHERE id = ${categoryId} RETURNING id`;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    revalidatePath('/');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE category error:", error);
    return NextResponse.json({ error: "Failed to delete category." }, { status: 500 });
  }
}
