import { NextRequest, NextResponse } from "next/server";
import { createAuthToken, normalizeEmail, normalizePhone, parseAuthToken } from "@/lib/auth";
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

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const user = parseAuthToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "admin") {
    return NextResponse.json({ error: "Admin profile edit is not supported here" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const body = (await req.json()) as {
    name?: string;
    phone?: string;
    email?: string;
    kakao_id?: string | null;
    line_id?: string | null;
    telegram_id?: string | null;
  };

  const name = body.name?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const phoneNormalized = normalizePhone(phone);
  const emailNormalized = normalizeEmail(email);

  if (!name || !phone || !email) {
    return NextResponse.json({ error: "name, phone, email are required" }, { status: 400 });
  }
  if (phoneNormalized.length < 8) {
    return NextResponse.json({ error: "invalid phone format" }, { status: 400 });
  }
  if (!emailNormalized.includes("@")) {
    return NextResponse.json({ error: "invalid email format" }, { status: 400 });
  }

  const { data: existsPhone, error: existsPhoneError } = await supabase
    .from("members")
    .select("id")
    .eq("phone_normalized", phoneNormalized)
    .neq("id", user.id)
    .maybeSingle();
  if (existsPhoneError) return NextResponse.json({ error: existsPhoneError.message }, { status: 400 });
  if (existsPhone) return NextResponse.json({ error: "duplicate phone" }, { status: 409 });

  const { data: existsEmail, error: existsEmailError } = await supabase
    .from("members")
    .select("id")
    .eq("email_normalized", emailNormalized)
    .neq("id", user.id)
    .maybeSingle();
  if (existsEmailError) return NextResponse.json({ error: existsEmailError.message }, { status: 400 });
  if (existsEmail) return NextResponse.json({ error: "duplicate email" }, { status: 409 });

  const payload = {
    name,
    phone,
    phone_normalized: phoneNormalized,
    email,
    email_normalized: emailNormalized,
    kakao_id: body.kakao_id?.trim() || null,
    line_id: body.line_id?.trim() || null,
    telegram_id: body.telegram_id?.trim() || null,
  };

  const { data, error } = await supabase
    .from("members")
    .update(payload)
    .eq("id", user.id)
    .select("id, login_id, name, phone, email, kakao_id, line_id, telegram_id, created_at, updated_at")
    .single();

  if (error) {
    if (error.message.includes("members_phone_normalized_key")) {
      return NextResponse.json({ error: "duplicate phone" }, { status: 409 });
    }
    if (error.message.includes("members_email_normalized_key")) {
      return NextResponse.json({ error: "duplicate email" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const refreshed = createAuthToken({
    id: user.id,
    role: "member",
    name: data.name,
    email: data.email,
  });

  const res = NextResponse.json({ ok: true, member: data });
  res.cookies.set(AUTH_COOKIE, refreshed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
