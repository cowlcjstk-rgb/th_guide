import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const { data: placesWithStatus, error: placesStatusError } = await supabase
    .from("places")
    .select("*")
    .or("submission_status.eq.pending,is_published.eq.false")
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: plansWithStatus, error: plansStatusError } = await supabase
    .from("trip_plans")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: editsWithStatus, error: editsStatusError } = await supabase
    .from("place_edit_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: placesFallback, error: placesFallbackError } = placesStatusError
    ? await supabase
        .from("places")
        .select("*")
        .eq("is_published", false)
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: placesWithStatus, error: null };

  const { data: plansFallback, error: plansFallbackError } = plansStatusError
    ? await supabase.from("trip_plans").select("*").order("created_at", { ascending: false }).limit(200)
    : { data: plansWithStatus, error: null };

  const { data: editsFallback, error: editsFallbackError } = editsStatusError
    ? await supabase.from("place_edit_requests").select("*").order("created_at", { ascending: false }).limit(200)
    : { data: editsWithStatus, error: null };

  if (placesFallbackError) return NextResponse.json({ error: placesFallbackError.message }, { status: 400 });
  if (plansFallbackError) return NextResponse.json({ error: plansFallbackError.message }, { status: 400 });
  if (editsFallbackError) {
    if (editsFallbackError.message.includes("place_edit_requests")) {
      return NextResponse.json({ error: "place_edit_requests table is missing. Run upgrade_place_edit_requests.sql first." }, { status: 400 });
    }
    return NextResponse.json({ error: editsFallbackError.message }, { status: 400 });
  }

  const editPlaceIds = (editsFallback ?? []).map((item) => item.place_id).filter(Boolean);
  const placeIds = Array.from(new Set([...(placesFallback ?? []).map((item) => item.id).filter(Boolean), ...editPlaceIds]));
  let imagesByPlace: Record<string, unknown[]> = {};
  let placeById: Record<string, unknown> = {};
  if (placeIds.length > 0) {
    const imagesRes = await supabase
      .from("place_submission_images")
      .select("id,place_id,image_url,moderation_status,review_note,reviewed_at,created_at")
      .in("place_id", placeIds)
      .order("created_at", { ascending: true });
    if (!imagesRes.error && imagesRes.data) {
      imagesByPlace = imagesRes.data.reduce<Record<string, unknown[]>>((acc, row) => {
        const key = String(row.place_id);
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
      }, {});
    }

    const placeRes = await supabase
      .from("places")
      .select("id,name,city,category,address,google_map_url,description,tags,tips")
      .in("id", placeIds);
    if (!placeRes.error && placeRes.data) {
      placeById = placeRes.data.reduce<Record<string, unknown>>((acc, row) => {
        acc[String(row.id)] = row;
        return acc;
      }, {});
    }
  }

  return NextResponse.json({
    places: placesFallback ?? [],
    plans: plansFallback ?? [],
    editRequests: editsFallback ?? [],
    imagesByPlace,
    placeById,
  });
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const body = (await req.json()) as {
    type?: "place" | "plan" | "image" | "edit";
    id?: string;
    action?: "approve" | "reject";
    note?: string;
  };
  if (!body.type || !body.id || !body.action) {
    return NextResponse.json({ error: "type, id, action are required" }, { status: 400 });
  }

  if (body.type === "place") {
    const payload =
      body.action === "approve"
        ? {
            is_published: true,
            submission_status: "approved",
            last_verified_at: new Date().toISOString(),
          }
        : {
            is_published: false,
            submission_status: "rejected",
          };

    const { error } = await supabase.from("places").update(payload).eq("id", body.id);
    if (error && error.message.includes("submission_status")) {
      const fallbackPayload = body.action === "approve" ? { is_published: true } : { is_published: false };
      const fallback = await supabase.from("places").update(fallbackPayload).eq("id", body.id);
      if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    if (body.action === "approve") {
      const imagesRes = await supabase
        .from("place_submission_images")
        .select("image_url")
        .eq("place_id", body.id)
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: true });
      const imageRows = imagesRes.data ?? [];
      if (imageRows.length > 0) {
        await supabase.from("place_images").delete().eq("place_id", body.id);
        await supabase.from("place_images").insert(
          imageRows.map((row, index) => ({
            place_id: body.id,
            image_url: row.image_url,
            sort_order: index,
          }))
        );
        await supabase.from("places").update({ thumbnail: imageRows[0].image_url }).eq("id", body.id);
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (body.type === "image") {
    const status = body.action === "approve" ? "approved" : "rejected";
    const { error } = await supabase
      .from("place_submission_images")
      .update({
        moderation_status: status,
        review_note: body.note?.trim() || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (body.type === "edit") {
    const { data: requestRow, error: reqError } = await supabase
      .from("place_edit_requests")
      .select("*")
      .eq("id", body.id)
      .maybeSingle();
    if (reqError) return NextResponse.json({ error: reqError.message }, { status: 400 });
    if (!requestRow) return NextResponse.json({ error: "request not found" }, { status: 404 });

    if (body.action === "approve") {
      const rawChanges = (requestRow.requested_changes ?? {}) as Record<string, unknown>;
      const payload: Record<string, unknown> = {};
      const allowed = ["name", "city", "category", "address", "description", "google_map_url", "tips", "tags"];
      for (const key of allowed) {
        if (!(key in rawChanges)) continue;
        payload[key] = rawChanges[key];
      }
      payload.last_verified_at = new Date().toISOString();
      payload.updated_at = new Date().toISOString();

      const placeUpdate = await supabase.from("places").update(payload).eq("id", requestRow.place_id);
      if (placeUpdate.error) return NextResponse.json({ error: placeUpdate.error.message }, { status: 400 });
    }

    const updateRequest = await supabase
      .from("place_edit_requests")
      .update({
        status: body.action === "approve" ? "approved" : "rejected",
        review_note: body.note?.trim() || null,
        reviewed_by: "admin",
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id);
    if (updateRequest.error) return NextResponse.json({ error: updateRequest.error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("trip_plans")
    .update({ status: body.action === "approve" ? "approved" : "rejected" })
    .eq("id", body.id);
  if (error && error.message.includes("status")) {
    return NextResponse.json({ ok: true });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
