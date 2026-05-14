import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit-log";
import { trackEventServer } from "@/lib/analytics";
import { applyRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { slugify } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req, "submissions:places", { max: 12, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

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
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const baseSlug = slugify(body.name);
  const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-6)}`;

  const { data, error } = await supabase
    .from("places")
    .insert({
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
      submitted_by: body.submitted_by?.trim() || null,
    })
    .select("id, name")
    .single();

  if (error && (error.message.includes("submission_status") || error.message.includes("city"))) {
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
      })
      .select("id, name")
      .single();
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 400 });
    const fallbackId = fallback.data?.id as string | undefined;
    const rawImages = Array.isArray(body.image_urls) ? body.image_urls : [];
    const imageUrls = rawImages.map((url) => url.trim()).filter(Boolean).slice(0, 8);
    if (fallbackId && imageUrls.length > 0) {
      await supabase.from("place_submission_images").insert(
        imageUrls.map((imageUrl) => ({
          place_id: fallbackId,
          image_url: imageUrl,
          moderation_status: "pending",
        }))
      );
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
  const imageUrls = rawImages.map((url) => url.trim()).filter(Boolean).slice(0, 8);
  if (imageUrls.length > 0) {
    await supabase.from("place_submission_images").insert(
      imageUrls.map((imageUrl) => ({
        place_id: data.id,
        image_url: imageUrl,
        moderation_status: "pending",
      }))
    );
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
