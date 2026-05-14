import { NextRequest, NextResponse } from "next/server";
import { createAuthToken, normalizeLoginId, parseAuthToken, verifyPassword } from "@/lib/auth";
import { auditLog } from "@/lib/audit-log";
import { applyRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const AUTH_COOKIE = "tg_auth";

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req, "auth:login", { max: 10, windowMs: 60_000 });
  if (limited) return limited;

  const body = (await req.json()) as { login_id?: string; password?: string };
  const loginId = body.login_id?.trim() ?? "";
  const password = body.password ?? "";

  if (!loginId || !password) {
    return NextResponse.json({ error: "login_id and password are required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const normalized = normalizeLoginId(loginId);
  const { data: member, error } = await supabase
    .from("members")
    .select("id, login_id, name, email, role, login_id_normalized, password_hash")
    .eq("login_id_normalized", normalized)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!member) {
    auditLog("login_failed_user_not_found", { loginId: normalized });
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }
  if (!verifyPassword(password, member.password_hash)) {
    auditLog("login_failed_password", { memberId: member.id });
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const token = createAuthToken({
    id: member.id,
    role: member.role === "admin" ? "admin" : "member",
    name: member.name,
    email: member.email,
  });
  const res = NextResponse.json({ ok: true, role: member.role === "admin" ? "admin" : "member" });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  auditLog("login_success", { memberId: member.id, role: member.role });
  return res;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const user = parseAuthToken(token);
  return NextResponse.json({ user });
}
