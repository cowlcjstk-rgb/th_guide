import { NextResponse } from "next/server";
import { buildNightlifeUrl } from "@/lib/nightlife-platform";

const movedTo = buildNightlifeUrl("/api/admin/products");

function movedResponse() {
  return NextResponse.json(
    {
      error: "nightlife platform moved to separate domain",
      moved_to: movedTo || null,
    },
    { status: 410 }
  );
}

export async function GET() {
  return movedResponse();
}

export async function POST() {
  return movedResponse();
}

export async function DELETE() {
  return movedResponse();
}

