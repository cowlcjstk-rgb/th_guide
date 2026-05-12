import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CreatePlaceBody = {
  name: string;
  slug: string;
  description?: string;
  address?: string;
  district?: string;
  category?: string;
  tags?: string[];
  latitude?: number;
  longitude?: number;
  google_map_url?: string;
  is_published?: boolean;
};

export async function POST(req: NextRequest) {
  const adminToken = process.env.ADMIN_WRITE_TOKEN;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!adminToken || !serviceRole || !url) {
    return NextResponse.json({ error: "Server env is missing" }, { status: 500 });
  }

  const token = req.headers.get("x-admin-token");
  if (token !== adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as CreatePlaceBody;
  if (!body.name || !body.slug) {
    return NextResponse.json({ error: "name, slug are required" }, { status: 400 });
  }

  const supabase = createClient(url, serviceRole);
  const { data, error } = await supabase
    .from("places")
    .insert({
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
      address: body.address ?? null,
      district: body.district ?? null,
      category: body.category ?? null,
      tags: body.tags ?? [],
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      google_map_url: body.google_map_url ?? null,
      is_published: body.is_published ?? false,
    })
    .select("id, name, slug")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, place: data });
}
