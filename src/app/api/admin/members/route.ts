import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().replace(/[,]/g, "");

  let query = supabase
    .from("members")
    .select("id, login_id, name, phone, email, kakao_id, line_id, telegram_id, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (q) {
    query = query.or(
      [
        `name.ilike.%${q}%`,
        `login_id.ilike.%${q}%`,
        `phone.ilike.%${q}%`,
        `email.ilike.%${q}%`,
        `kakao_id.ilike.%${q}%`,
        `line_id.ilike.%${q}%`,
        `telegram_id.ilike.%${q}%`,
      ].join(",")
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ members: data ?? [] });
}
