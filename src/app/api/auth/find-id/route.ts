import { NextRequest, NextResponse } from "next/server";
import { normalizePhone } from "@/lib/auth";
import { applyRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req, "auth:find-id", { max: 6, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const body = (await req.json()) as { name?: string; phone?: string };
  const name = body.name?.trim();
  const phone = body.phone?.trim();

  if (!name || !phone) return NextResponse.json({ error: "name and phone are required" }, { status: 400 });

  const { data, error } = await supabase
    .from("members")
    .select("email")
    .eq("name", name)
    .eq("phone_normalized", normalizePhone(phone))
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ email: data.email });
}
