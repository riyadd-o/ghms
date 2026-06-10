import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import sql from "@/lib/db";

// GET /api/categories — list all categories
export async function GET() {
  try {
    const rows = await sql`SELECT id, name, created_at FROM categories ORDER BY created_at ASC`;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET categories error:", error);
    return NextResponse.json({ error: "Failed to fetch categories." }, { status: 500 });
  }
}

// POST /api/categories — create a new category
export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Category name is required." }, { status: 400 });
    }

    const rows = await sql`INSERT INTO categories (name) VALUES (${name.trim()}) RETURNING id, name, created_at`;
    
    revalidatePath('/');
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: unknown) {
    console.error("POST categories error:", error);
    // Handle unique constraint violation
    if (error instanceof Error && error.message?.includes("duplicate")) {
      return NextResponse.json({ error: "Category already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create category." }, { status: 500 });
  }
}
