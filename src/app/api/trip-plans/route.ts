import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit-log";
import { trackEventServer } from "@/lib/analytics";
import { getMemberSession } from "@/lib/auth-request";
import { applyRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req, "trip-plans:create", { max: 10, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });
  const member = getMemberSession(req);

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

  const submittedBy = body.submitted_by?.trim() || member?.name || null;
  const insertPayload = {
    title: body.title?.trim() || null,
    description: body.description?.trim() || null,
    extra_info: body.extra_info?.trim() || null,
    submitted_by: submittedBy,
    submitted_by_member_id: member?.id ?? null,
    status: "pending",
    place_ids: ids,
  };

  const { data, error } = await supabase
    .from("trip_plans")
    .insert(insertPayload)
    .select("*")
    .single();

  if (
    error &&
    (error.message.includes("description") ||
      error.message.includes("status") ||
      error.message.includes("submitted_by_member_id"))
  ) {
    const fallback = await supabase
      .from("trip_plans")
      .insert({
        title: body.title?.trim() || null,
        submitted_by: submittedBy,
        place_ids: ids,
      })
      .select("*")
      .single();
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 400 });
    return NextResponse.json({ plan: fallback.data });
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  auditLog("trip_plan_submission_created", { planId: data.id, size: ids.length });
  await trackEventServer({
    event_name: "trip_plan_submit_complete",
    path: "/api/trip-plans",
    meta: {
      place_count: ids.length,
      has_description: Boolean(body.description?.trim()),
      has_extra_info: Boolean(body.extra_info?.trim()),
    },
  });
  return NextResponse.json({ plan: data });
}
