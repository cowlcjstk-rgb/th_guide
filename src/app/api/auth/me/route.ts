import { NextRequest, NextResponse } from "next/server";
import { parseAuthToken } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const AUTH_COOKIE = "tg_auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const user = parseAuthToken(token);
  if (!user) return NextResponse.json({ user: null });

  if (user.role === "admin") return NextResponse.json({ user, member: null });

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ user, member: null });

  const { data } = await supabase
    .from("members")
    .select("id, login_id, name, phone, email, kakao_id, line_id, telegram_id, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({ user, member: data ?? null });
}
