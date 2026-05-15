import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit-log";
import { trackEventServer } from "@/lib/analytics";
import { getMemberSession } from "@/lib/auth-request";
import { applyRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { slugify } from "@/lib/utils";

type IncomingImageUpload = {
  url?: string;
  bucket?: string;
  path?: string;
  file_name?: string;
  mime_type?: string;
  file_size_bytes?: number;
};

type PlaceSubmissionImageInsertRow = {
  place_id: string;
  image_url: string;
  moderation_status: "pending";
  storage_bucket?: string;
  storage_path?: string;
  file_name?: string;
  mime_type?: string;
  file_size_bytes?: number;
  uploaded_by_member_id?: string;
};

function normalizeImageUpload(upload: IncomingImageUpload | null | undefined) {
  if (!upload || typeof upload !== "object") return null;
  const url = typeof upload.url === "string" ? upload.url.trim() : "";
  if (!url) return null;
  return {
    url,
    bucket: typeof upload.bucket === "string" ? upload.bucket.trim() : "",
    path: typeof upload.path === "string" ? upload.path.trim() : "",
    file_name: typeof upload.file_name === "string" ? upload.file_name.trim() : "",
    mime_type: typeof upload.mime_type === "string" ? upload.mime_type.trim() : "",
    file_size_bytes:
      typeof upload.file_size_bytes === "number" && Number.isFinite(upload.file_size_bytes) && upload.file_size_bytes >= 0
        ? Math.round(upload.file_size_bytes)
        : 0,
  };
}

async function insertSubmissionImages(supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>, rows: PlaceSubmissionImageInsertRow[]) {
  if (rows.length === 0) return;

  const insertRes = await supabase.from("place_submission_images").insert(rows);
  if (!insertRes.error) return;

  const message = insertRes.error.message.toLowerCase();
  if (message.includes("column") && message.includes("does not exist")) {
    await supabase.from("place_submission_images").insert(
      rows.map((row) => ({
        place_id: row.place_id,
        image_url: row.image_url,
        moderation_status: row.moderation_status,
      }))
    );
  }
}

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req, "submissions:places", { max: 12, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });
  const member = getMemberSession(req);

  const body = (await req.json()) as {
    name?: string;
    city?: string;
    district?: string;
    category?: string;
    address?: string;
    description?: string;
    google_map_url?: string;
    tags?: string[];
    tips?: string;
    submitted_by?: string;
    image_urls?: string[];
    image_upload?: IncomingImageUpload | null;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const baseSlug = slugify(body.name);
  const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-6)}`;

  const submittedBy = body.submitted_by?.trim() || member?.name || null;
  const normalizedImageUpload = normalizeImageUpload(body.image_upload);
  const insertPayload = {
    name: body.name.trim(),
    slug: uniqueSlug,
    city: body.city?.trim() || null,
    district: body.district?.trim() || null,
    category: body.category?.trim() || null,
    address: body.address?.trim() || null,
    description: body.description?.trim() || null,
    google_map_url: body.google_map_url?.trim() || null,
    tags: Array.isArray(body.tags) ? body.tags.map((tag) => tag.trim()).filter(Boolean) : [],
    tips: body.tips?.trim() || null,
    is_featured: false,
    is_published: false,
    submission_status: "pending",
    submitted_by: submittedBy,
    submitted_by_member_id: member?.id ?? null,
  };

  const { data, error } = await supabase
    .from("places")
    .insert(insertPayload)
    .select("id, name")
    .single();

  if (
    error &&
    (error.message.includes("submission_status") ||
      error.message.includes("city") ||
      error.message.includes("submitted_by_member_id"))
  ) {
    const fallback = await supabase
      .from("places")
      .insert({
        name: body.name.trim(),
        slug: uniqueSlug,
        district: body.district?.trim() || null,
        category: body.category?.trim() || null,
        address: body.address?.trim() || null,
        description: body.description?.trim() || null,
        google_map_url: body.google_map_url?.trim() || null,
        tags: Array.isArray(body.tags) ? body.tags.map((tag) => tag.trim()).filter(Boolean) : [],
        tips: body.tips?.trim() || null,
        is_featured: false,
        is_published: false,
        submission_status: "pending",
        submitted_by: submittedBy,
      })
      .select("id, name")
      .single();
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 400 });
    const fallbackId = fallback.data?.id as string | undefined;
    const rawImages = Array.isArray(body.image_urls) ? body.image_urls : [];
    const imageUrls = rawImages.map((url) => url.trim()).filter(Boolean).slice(0, 1);
    if (fallbackId && imageUrls.length > 0) {
      const rows: PlaceSubmissionImageInsertRow[] = imageUrls.map((imageUrl) => {
        if (!normalizedImageUpload || normalizedImageUpload.url !== imageUrl) {
          return {
            place_id: fallbackId,
            image_url: imageUrl,
            moderation_status: "pending",
          };
        }
        return {
          place_id: fallbackId,
          image_url: imageUrl,
          moderation_status: "pending",
          storage_bucket: normalizedImageUpload.bucket || undefined,
          storage_path: normalizedImageUpload.path || undefined,
          file_name: normalizedImageUpload.file_name || undefined,
          mime_type: normalizedImageUpload.mime_type || undefined,
          file_size_bytes: normalizedImageUpload.file_size_bytes || undefined,
          uploaded_by_member_id: member?.id ?? undefined,
        };
      });
      await insertSubmissionImages(supabase, rows);
    }
    await trackEventServer({
      event_name: "place_submit_complete",
      path: "/submit/place",
      meta: {
        place_id: fallbackId ?? null,
        image_count: imageUrls.length,
      },
    });
    return NextResponse.json({ ok: true, submission: fallback.data });
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const rawImages = Array.isArray(body.image_urls) ? body.image_urls : [];
  const imageUrls = rawImages.map((url) => url.trim()).filter(Boolean).slice(0, 1);
  if (imageUrls.length > 0) {
    const rows: PlaceSubmissionImageInsertRow[] = imageUrls.map((imageUrl) => {
      if (!normalizedImageUpload || normalizedImageUpload.url !== imageUrl) {
        return {
          place_id: data.id,
          image_url: imageUrl,
          moderation_status: "pending",
        };
      }
      return {
        place_id: data.id,
        image_url: imageUrl,
        moderation_status: "pending",
        storage_bucket: normalizedImageUpload.bucket || undefined,
        storage_path: normalizedImageUpload.path || undefined,
        file_name: normalizedImageUpload.file_name || undefined,
        mime_type: normalizedImageUpload.mime_type || undefined,
        file_size_bytes: normalizedImageUpload.file_size_bytes || undefined,
        uploaded_by_member_id: member?.id ?? undefined,
      };
    });
    await insertSubmissionImages(supabase, rows);
  }
  auditLog("place_submission_created", { placeId: data.id, name: data.name });
  await trackEventServer({
    event_name: "place_submit_complete",
    path: "/submit/place",
    meta: {
      place_id: data.id,
      image_count: imageUrls.length,
    },
  });
  return NextResponse.json({ ok: true, submission: data });
}
