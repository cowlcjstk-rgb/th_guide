import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "thailand-guide",
    timestamp: new Date().toISOString(),
  });
}
