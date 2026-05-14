import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { CommunitySection } from "@/lib/types";

const VALID_SECTIONS = new Set<CommunitySection>([
  "top-rated",
  "latest-reviews",
  "route-shares",
  "guide",
  "faq",
]);

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const { data, error } = await supabase
    .from("community_contents")
    .select("*")
    .order("section")
    .order("sort_order")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const body = (await req.json()) as {
    section?: CommunitySection;
    title_ko?: string;
    title_en?: string;
    body_ko?: string;
    body_en?: string;
    sort_order?: number;
  };

  if (!body.section || !VALID_SECTIONS.has(body.section)) {
    return NextResponse.json({ error: "invalid section" }, { status: 400 });
  }
  if (!body.title_ko?.trim() || !body.title_en?.trim()) {
    return NextResponse.json({ error: "title_ko and title_en are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("community_contents")
    .insert({
      section: body.section,
      title_ko: body.title_ko.trim(),
      title_en: body.title_en.trim(),
      body_ko: body.body_ko?.trim() || "",
      body_en: body.body_en?.trim() || "",
      sort_order: Number.isFinite(body.sort_order) ? Number(body.sort_order) : 0,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ item: data });
}

export async function DELETE(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const body = (await req.json()) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabase.from("community_contents").delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
