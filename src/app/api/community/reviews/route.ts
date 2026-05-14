import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit-log";
import { applyRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("placeId");
  if (!placeId) return NextResponse.json({ error: "placeId is required" }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const { data, error } = await supabase
    .from("place_reviews")
    .select("*")
    .eq("place_id", placeId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ reviews: data ?? [] });
}

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req, "community:reviews:create", { max: 12, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const body = (await req.json()) as {
    place_id?: string;
    nickname?: string;
    rating?: number;
    comment?: string;
  };
  if (!body.place_id || !body.rating) {
    return NextResponse.json({ error: "place_id and rating are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("place_reviews")
    .insert({
      place_id: body.place_id,
      nickname: (body.nickname || "Guest").slice(0, 30),
      rating: body.rating,
      comment: body.comment?.trim() || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  auditLog("review_created", { reviewId: data.id, placeId: data.place_id, rating: data.rating });
  return NextResponse.json({ review: data });
}
