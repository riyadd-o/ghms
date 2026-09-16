import { NextResponse } from "next/server";
import { paymentService } from "@/lib/payments/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const stats = await paymentService.getPaymentStats();
    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("GET payment stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment statistics." },
      { status: 500 }
    );
  }
}
