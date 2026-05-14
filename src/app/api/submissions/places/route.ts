import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit-log";
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
    return NextResponse.json({ ok: true, submission: fallback.data });
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  auditLog("place_submission_created", { placeId: data.id, name: data.name });
  return NextResponse.json({ ok: true, submission: data });
}
