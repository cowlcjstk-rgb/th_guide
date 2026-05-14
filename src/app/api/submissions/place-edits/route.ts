import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit-log";
import { trackEventServer } from "@/lib/analytics";
import { applyRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const ALLOWED_FIELDS = new Set([
  "name",
  "city",
  "category",
  "address",
  "description",
  "google_map_url",
  "tips",
  "tags",
]);

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req, "submissions:place-edits", { max: 12, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const body = (await req.json()) as {
    place_id?: string;
    submitted_by?: string;
    reason?: string;
    requested_changes?: Record<string, unknown>;
  };

  const placeId = body.place_id?.trim();
  if (!placeId) return NextResponse.json({ error: "place_id is required" }, { status: 400 });

  const rawChanges = body.requested_changes ?? {};
  const requestedChanges: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(rawChanges)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    if (raw == null) continue;
    if (key === "tags") {
      const tags = Array.isArray(raw)
        ? raw.map((v) => String(v).trim()).filter(Boolean).slice(0, 30)
        : String(raw)
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
            .slice(0, 30);
      if (tags.length > 0) requestedChanges.tags = tags;
      continue;
    }
    const value = String(raw).trim();
    if (!value) continue;
    requestedChanges[key] = value;
  }

  if (Object.keys(requestedChanges).length === 0) {
    return NextResponse.json({ error: "at least one change is required" }, { status: 400 });
  }

  const { data: place, error: placeError } = await supabase
    .from("places")
    .select("id,name,is_published")
    .eq("id", placeId)
    .maybeSingle();
  if (placeError) return NextResponse.json({ error: placeError.message }, { status: 400 });
  if (!place) return NextResponse.json({ error: "place not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("place_edit_requests")
    .insert({
      place_id: placeId,
      requested_changes: requestedChanges,
      reason: body.reason?.trim() || null,
      submitted_by: body.submitted_by?.trim() || null,
      status: "pending",
    })
    .select("id, place_id, status, created_at")
    .single();

  if (error) {
    if (error.message.includes("place_edit_requests")) {
      return NextResponse.json(
        { error: "place_edit_requests table is missing. Run supabase/upgrade_place_edit_requests.sql first." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  auditLog("place_edit_request_created", { placeId, requestId: data.id });
  await trackEventServer({
    event_name: "place_edit_request_submit_complete",
    path: "/submit/place-edit",
    meta: {
      place_id: placeId,
      request_id: data.id,
      changed_fields: Object.keys(requestedChanges),
    },
  });

  return NextResponse.json({ ok: true, request: data, place });
}
