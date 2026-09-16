import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { paymentService } from "@/lib/payments/service";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("staff_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized. Staff authentication required." }, { status: 401 });
    }

    let staffPayload: { id: number; email: string; role: string };
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      staffPayload = payload as unknown as { id: number; email: string; role: string };
    } catch {
      return NextResponse.json({ error: "Invalid or expired staff session." }, { status: 401 });
    }

    const { order_id } = await req.json();
    if (!order_id) {
      return NextResponse.json({ error: "order_id is required." }, { status: 400 });
    }

    const updatedPayment = await paymentService.confirmCashPayment(
      Number(order_id),
      staffPayload.id,
      staffPayload.email
    );

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
    });
  } catch (error) {
    console.error("Confirm cash error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to confirm cash payment." },
      { status: 500 }
    );
  }
}
