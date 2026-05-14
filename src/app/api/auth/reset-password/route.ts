import { NextRequest, NextResponse } from "next/server";
import { hashPassword, normalizeEmail } from "@/lib/auth";
import { applyRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req, "auth:reset-password", { max: 5, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const body = (await req.json()) as { email?: string; new_password?: string };
  const email = body.email?.trim();
  const newPassword = body.new_password ?? "";

  if (!email || !newPassword) {
    return NextResponse.json({ error: "email and new_password are required" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "password must be at least 6 chars" }, { status: 400 });
  }

  const normalized = normalizeEmail(email);
  const { data: member, error: findError } = await supabase
    .from("members")
    .select("id")
    .eq("email_normalized", normalized)
    .maybeSingle();

  if (findError) return NextResponse.json({ error: findError.message }, { status: 400 });
  if (!member) return NextResponse.json({ error: "email not found" }, { status: 404 });

  const { error } = await supabase
    .from("members")
    .update({
      password_hash: hashPassword(newPassword),
      updated_at: new Date().toISOString(),
    })
    .eq("id", member.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
