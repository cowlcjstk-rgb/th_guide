import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRequest } from "@/lib/admin-auth";
import { slugify } from "@/lib/utils";

type CreatePlaceBody = {
  name: string;
  slug: string;
  city?: string;
  description?: string;
  address?: string;
  district?: string;
  category?: string;
  tags?: string[];
  latitude?: number;
  longitude?: number;
  google_map_url?: string;
  tips?: string;
  is_featured?: boolean;
  is_published?: boolean;
};

export async function POST(req: NextRequest) {
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRole || !url) {
    return NextResponse.json({ error: "Server env is missing" }, { status: 500 });
  }

  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as CreatePlaceBody;
  if (!body.name || !body.slug) {
    return NextResponse.json({ error: "name, slug are required" }, { status: 400 });
  }

  const cleanedSlug = slugify(body.slug || body.name);

  const supabase = createClient(url, serviceRole);
  const { data, error } = await supabase
    .from("places")
    .insert({
      name: body.name,
      slug: cleanedSlug,
      city: body.city ?? null,
      description: body.description ?? null,
      address: body.address ?? null,
      district: body.district ?? null,
      category: body.category ?? null,
      tags: body.tags ?? [],
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      google_map_url: body.google_map_url ?? null,
      tips: body.tips ?? null,
      is_featured: body.is_featured ?? false,
      is_published: body.is_published ?? false,
      submission_status: "approved",
      submitted_by: null,
      last_verified_at: new Date().toISOString(),
    })
    .select("id, name, slug")
    .single();

  if (error && (error.message.includes("submission_status") || error.message.includes("city"))) {
    const fallback = await supabase
      .from("places")
      .insert({
        name: body.name,
        slug: cleanedSlug,
        description: body.description ?? null,
        address: body.address ?? null,
        district: body.district ?? null,
        category: body.category ?? null,
        tags: body.tags ?? [],
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        google_map_url: body.google_map_url ?? null,
        tips: body.tips ?? null,
        is_featured: body.is_featured ?? false,
        is_published: body.is_published ?? false,
        last_verified_at: new Date().toISOString(),
      })
      .select("id, name, slug")
      .single();
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 400 });
    return NextResponse.json({ ok: true, place: fallback.data });
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, place: data });
}
