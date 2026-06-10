import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import crypto from "crypto";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { email, role } = await req.json();

    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
    }

    const users = await sql`SELECT id FROM users WHERE email = ${email} AND role = ${role}`;

    if (users.length === 0) {
      return NextResponse.json({ error: "No account found with this email." }, { status: 404 });
    }

    const user = users[0];
    const token = crypto.randomUUID();

    await sql`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${user.id}, ${token}, NOW() + INTERVAL '1 hour')
    `;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}&role=${role}`;

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email, // Changed from hardcoded admin email to the requested email
      subject: "Golden Hotel - Password Reset Request",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
          <h1 style="color: #C9A84C;">Golden Hotel</h1>
          <p>Click the link below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #C9A84C; color: #1A1A1A; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px;">Reset Password</a>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: "A password reset link has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
