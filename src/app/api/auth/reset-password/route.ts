import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, password, role } = await req.json();

    if (!token || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const tokens = await sql`
      SELECT user_id FROM password_reset_tokens 
      WHERE token = ${token} AND used = FALSE AND expires_at > NOW()
    `;

    if (tokens.length === 0) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    const userId = tokens[0].user_id;

    // Verify the user role matches
    const users = await sql`SELECT id FROM users WHERE id = ${userId} AND role = ${role}`;
    if (users.length === 0) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Run updates in transaction if possible, or just sequentially
    await sql`UPDATE users SET password_hash = ${hashedPassword} WHERE id = ${userId}`;
    await sql`UPDATE password_reset_tokens SET used = TRUE WHERE token = ${token}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
