import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/payments/service";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-chapa-signature") || undefined;

    const result = await paymentService.handleWebhook(rawBody, signature);

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Webhook processing failed." },
      { status: 400 }
    );
  }
}
