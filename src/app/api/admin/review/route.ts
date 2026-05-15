import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type IncomingImageUpload = {
  url?: string;
  bucket?: string;
  path?: string;
  file_name?: string;
  mime_type?: string;
  file_size_bytes?: number;
};

function normalizeImageUpload(upload: unknown) {
  if (!upload || typeof upload !== "object") return null;
  const raw = upload as IncomingImageUpload;
  const url = typeof raw.url === "string" ? raw.url.trim() : "";
  if (!url) return null;

  return {
    url,
    bucket: typeof raw.bucket === "string" ? raw.bucket.trim() : "",
    path: typeof raw.path === "string" ? raw.path.trim() : "",
    file_name: typeof raw.file_name === "string" ? raw.file_name.trim() : "",
    mime_type: typeof raw.mime_type === "string" ? raw.mime_type.trim() : "",
    file_size_bytes:
      typeof raw.file_size_bytes === "number" && Number.isFinite(raw.file_size_bytes) && raw.file_size_bytes >= 0
        ? Math.round(raw.file_size_bytes)
        : 0,
  };
}

async function insertApprovedSubmissionImage(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  input: {
    placeId: string;
    imageUrl: string;
    reviewNote: string | null;
    reviewedAt: string;
    imageUploadMeta?: ReturnType<typeof normalizeImageUpload> | null;
  }
) {
  const row = {
    place_id: input.placeId,
    image_url: input.imageUrl,
    moderation_status: "approved" as const,
    review_note: input.reviewNote,
    reviewed_at: input.reviewedAt,
    storage_bucket: input.imageUploadMeta?.bucket || undefined,
    storage_path: input.imageUploadMeta?.path || undefined,
    file_name: input.imageUploadMeta?.file_name || undefined,
    mime_type: input.imageUploadMeta?.mime_type || undefined,
    file_size_bytes: input.imageUploadMeta?.file_size_bytes || undefined,
  };

  const insertRes = await supabase.from("place_submission_images").insert(row);
  if (!insertRes.error) return;

  const message = insertRes.error.message.toLowerCase();
  if (message.includes("column") && message.includes("does not exist")) {
    await supabase.from("place_submission_images").insert({
      place_id: input.placeId,
      image_url: input.imageUrl,
      moderation_status: "approved",
      review_note: input.reviewNote,
      reviewed_at: input.reviewedAt,
    });
  }
}

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
    const imagesResPrimary = await supabase
      .from("place_submission_images")
      .select("id,place_id,image_url,moderation_status,review_note,reviewed_at,created_at,storage_bucket,storage_path,file_name,mime_type,file_size_bytes")
      .in("place_id", placeIds)
      .order("created_at", { ascending: true });

    let imageRows: Array<{ place_id: string } & Record<string, unknown>> = [];
    if (imagesResPrimary.error && imagesResPrimary.error.message.toLowerCase().includes("column")) {
      const imagesResFallback = await supabase
        .from("place_submission_images")
        .select("id,place_id,image_url,moderation_status,review_note,reviewed_at,created_at")
        .in("place_id", placeIds)
        .order("created_at", { ascending: true });
      if (!imagesResFallback.error && imagesResFallback.data) {
        imageRows = imagesResFallback.data as Array<{ place_id: string } & Record<string, unknown>>;
      }
    } else if (!imagesResPrimary.error && imagesResPrimary.data) {
      imageRows = imagesResPrimary.data as Array<{ place_id: string } & Record<string, unknown>>;
    }

    if (imageRows.length > 0) {
      imagesByPlace = imageRows.reduce((acc: Record<string, unknown[]>, row) => {
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
      const nowIso = new Date().toISOString();
      const imageUrl = typeof rawChanges.image_url === "string" ? rawChanges.image_url.trim() : "";
      const imageUploadMeta = normalizeImageUpload(rawChanges.image_upload);

      for (const key of allowed) {
        if (!(key in rawChanges)) continue;
        payload[key] = rawChanges[key];
      }
      payload.last_verified_at = nowIso;
      payload.updated_at = nowIso;

      const placeUpdate = await supabase.from("places").update(payload).eq("id", requestRow.place_id);
      if (placeUpdate.error) return NextResponse.json({ error: placeUpdate.error.message }, { status: 400 });

      if (imageUrl) {
        const existingImagesRes = await supabase
          .from("place_images")
          .select("id,image_url,sort_order")
          .eq("place_id", requestRow.place_id)
          .order("sort_order", { ascending: true })
          .limit(200);
        if (existingImagesRes.error) return NextResponse.json({ error: existingImagesRes.error.message }, { status: 400 });

        const existingImages = existingImagesRes.data ?? [];
        const alreadyExists = existingImages.some((row) => row.image_url === imageUrl);
        if (!alreadyExists) {
          const maxSort = existingImages.reduce((max, row) => Math.max(max, Number(row.sort_order) || 0), -1);
          const insertImage = await supabase.from("place_images").insert({
            place_id: requestRow.place_id,
            image_url: imageUrl,
            sort_order: maxSort + 1,
          });
          if (insertImage.error) return NextResponse.json({ error: insertImage.error.message }, { status: 400 });
        }

        const updateThumb = await supabase
          .from("places")
          .update({ thumbnail: imageUrl, last_verified_at: nowIso, updated_at: nowIso })
          .eq("id", requestRow.place_id);
        if (updateThumb.error) return NextResponse.json({ error: updateThumb.error.message }, { status: 400 });

        await insertApprovedSubmissionImage(supabase, {
          placeId: requestRow.place_id,
          imageUrl,
          reviewNote: body.note?.trim() || null,
          reviewedAt: nowIso,
          imageUploadMeta,
        });
      }
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
