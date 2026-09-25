import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/payments/service";

export async function POST(req: NextRequest) {
  try {
    const { order_id, tx_ref } = await req.json();

    if (!order_id && !tx_ref) {
      return NextResponse.json({ error: "order_id or tx_ref is required." }, { status: 400 });
    }

    const result = await paymentService.verifyPayment(order_id ? Number(order_id) : undefined, tx_ref);

    return NextResponse.json({
      success: true,
      order_id: result.payment.order_id,
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
    const txRef = searchParams.get("tx_ref") || searchParams.get("trx_ref") || undefined;

    if (!orderId && !txRef) {
      return NextResponse.json({ error: "order_id or tx_ref query parameter is required." }, { status: 400 });
    }

    const result = await paymentService.verifyPayment(orderId ? Number(orderId) : undefined, txRef);

    return NextResponse.json({
      success: true,
      order_id: result.payment.order_id,
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
