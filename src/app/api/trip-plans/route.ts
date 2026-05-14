import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit-log";
import { applyRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req, "trip-plans:create", { max: 10, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const body = (await req.json()) as {
    title?: string;
    description?: string;
    extra_info?: string;
    submitted_by?: string;
    place_ids?: string[];
  };
  const ids = Array.isArray(body.place_ids) ? body.place_ids.filter(Boolean) : [];
  if (ids.length < 2) {
    return NextResponse.json({ error: "at least 2 places are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("trip_plans")
    .insert({
      title: body.title?.trim() || null,
      description: body.description?.trim() || null,
      extra_info: body.extra_info?.trim() || null,
      submitted_by: body.submitted_by?.trim() || null,
      status: "pending",
      place_ids: ids,
    })
    .select("*")
    .single();

  if (error && (error.message.includes("description") || error.message.includes("status"))) {
    const fallback = await supabase
      .from("trip_plans")
      .insert({
        title: body.title?.trim() || null,
        place_ids: ids,
      })
      .select("*")
      .single();
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 400 });
    return NextResponse.json({ plan: fallback.data });
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  auditLog("trip_plan_submission_created", { planId: data.id, size: ids.length });
  return NextResponse.json({ plan: data });
}
