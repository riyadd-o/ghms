import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/payments/service";

export async function POST(req: NextRequest) {
  try {
    const { order_id, tx_ref } = await req.json();

    if (!order_id) {
      return NextResponse.json({ error: "order_id is required." }, { status: 400 });
    }

    const result = await paymentService.verifyPayment(Number(order_id), tx_ref);

    return NextResponse.json({
      success: true,
      verified: result.verified,
      status: result.status,
      payment: result.payment,
    });
  } catch (error) {
    console.error("Payment verify error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Verification failed." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("order_id");
    const txRef = searchParams.get("tx_ref") || undefined;

    if (!orderId) {
      return NextResponse.json({ error: "order_id query parameter is required." }, { status: 400 });
    }

    const result = await paymentService.verifyPayment(Number(orderId), txRef);

    return NextResponse.json({
      success: true,
      verified: result.verified,
      status: result.status,
      payment: result.payment,
    });
  } catch (error) {
    console.error("Payment verify error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Verification failed." },
      { status: 500 }
    );
  }
}
