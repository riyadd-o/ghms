import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/payments/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, method, customer_email, customer_name, return_url } = body;

    if (!order_id || !method) {
      return NextResponse.json(
        { error: "order_id and method (CASH or DIGITAL) are required." },
        { status: 400 }
      );
    }

    const normalizedMethod = String(method).toUpperCase();
    if (normalizedMethod !== "CASH" && normalizedMethod !== "DIGITAL") {
      return NextResponse.json(
        { error: "Invalid payment method. Must be CASH or DIGITAL." },
        { status: 400 }
      );
    }

    let returnUrlWithOrderId = return_url;
    if (returnUrlWithOrderId && typeof returnUrlWithOrderId === "string") {
      try {
        const u = new URL(returnUrlWithOrderId, "http://localhost:3000");
        u.searchParams.set("order_id", String(order_id));
        if (!u.searchParams.has("payment")) {
          u.searchParams.set("payment", "success");
        }
        returnUrlWithOrderId = u.toString();
      } catch {
        returnUrlWithOrderId = undefined;
      }
    }

    const result = await paymentService.createPayment({
      orderId: Number(order_id),
      method: normalizedMethod,
      customerEmail: customer_email,
      customerName: customer_name,
      returnUrl: returnUrlWithOrderId,
    });

    return NextResponse.json({
      success: true,
      payment: result.payment,
      checkout_url: result.checkoutUrl,
      already_paid: result.alreadyPaid,
    });
  } catch (error) {
    console.error("Payment create error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to initialize payment." },
      { status: 500 }
    );
  }
}
