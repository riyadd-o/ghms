import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/payments/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const method = searchParams.get("method") || undefined;
    const search = searchParams.get("search") || undefined;
    const date = searchParams.get("date") || undefined;

    const payments = await paymentService.listPayments({
      status,
      method,
      search,
      date,
    });

    return NextResponse.json(payments, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("GET payments list error:", error);
    return NextResponse.json(
      { error: "Failed to list payments." },
      { status: 500 }
    );
  }
}
