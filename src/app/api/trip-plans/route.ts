import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const body = (await req.json()) as { title?: string; place_ids?: string[] };
  const ids = Array.isArray(body.place_ids) ? body.place_ids.filter(Boolean) : [];
  if (ids.length < 2) {
    return NextResponse.json({ error: "at least 2 places are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("trip_plans")
    .insert({
      title: body.title?.trim() || null,
      place_ids: ids,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ plan: data });
}
