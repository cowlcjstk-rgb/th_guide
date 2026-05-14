import { NextRequest, NextResponse } from "next/server";
import { hashPassword, normalizeEmail, normalizeLoginId, normalizePhone } from "@/lib/auth";
import { trackEventServer } from "@/lib/analytics";
import { applyRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req, "members:register", { max: 8, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Server env missing" }, { status: 500 });

  const body = (await req.json()) as {
    login_id?: string;
    name?: string;
    phone?: string;
    email?: string;
    password?: string;
    kakao_id?: string;
    line_id?: string;
    telegram_id?: string;
  };

  const loginId = body.login_id?.trim();
  const name = body.name?.trim();
  const phone = body.phone?.trim();
  const email = body.email?.trim();
  const password = body.password ?? "";

  if (!loginId || !name || !phone || !email || !password) {
    return NextResponse.json({ error: "login_id, name, phone, email, password are required" }, { status: 400 });
  }

  const loginIdNormalized = normalizeLoginId(loginId);
  const phoneNormalized = normalizePhone(phone);
  const emailNormalized = normalizeEmail(email);

  if (loginIdNormalized.length < 4) {
    return NextResponse.json({ error: "login_id must be at least 4 chars" }, { status: 400 });
  }
  if (phoneNormalized.length < 8) {
    return NextResponse.json({ error: "invalid phone format" }, { status: 400 });
  }
  if (!emailNormalized.includes("@")) {
    return NextResponse.json({ error: "invalid email format" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "password must be at least 6 chars" }, { status: 400 });
  }

  const { data: existsByLoginId, error: loginCheckError } = await supabase
    .from("members")
    .select("id")
    .eq("login_id_normalized", loginIdNormalized)
    .maybeSingle();
  if (loginCheckError) return NextResponse.json({ error: loginCheckError.message }, { status: 400 });
  if (existsByLoginId) return NextResponse.json({ error: "duplicate login_id" }, { status: 409 });

  const { data: existsByPhone, error: phoneCheckError } = await supabase
    .from("members")
    .select("id")
    .eq("phone_normalized", phoneNormalized)
    .maybeSingle();
  if (phoneCheckError) return NextResponse.json({ error: phoneCheckError.message }, { status: 400 });
  if (existsByPhone) return NextResponse.json({ error: "duplicate phone" }, { status: 409 });

  const { data: existsByEmail, error: emailCheckError } = await supabase
    .from("members")
    .select("id")
    .eq("email_normalized", emailNormalized)
    .maybeSingle();
  if (emailCheckError) return NextResponse.json({ error: emailCheckError.message }, { status: 400 });
  if (existsByEmail) return NextResponse.json({ error: "duplicate email" }, { status: 409 });

  const { data, error } = await supabase
    .from("members")
    .insert({
      login_id: loginId,
      login_id_normalized: loginIdNormalized,
      name,
      phone,
      phone_normalized: phoneNormalized,
      email,
      email_normalized: emailNormalized,
      password_hash: hashPassword(password),
      role: "member",
      kakao_id: body.kakao_id?.trim() || null,
      line_id: body.line_id?.trim() || null,
      telegram_id: body.telegram_id?.trim() || null,
    })
    .select("id, login_id, name, phone, email, created_at")
    .single();

  if (error) {
    if (error.message.includes("members_login_id_normalized_key")) {
      return NextResponse.json({ error: "duplicate login_id" }, { status: 409 });
    }
    if (error.message.includes("members_phone_normalized_key")) {
      return NextResponse.json({ error: "duplicate phone" }, { status: 409 });
    }
    if (error.message.includes("members_email_normalized_key")) {
      return NextResponse.json({ error: "duplicate email" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await trackEventServer({
    event_name: "signup_complete",
    path: "/signup",
    user_id: data.id,
    meta: {
      has_kakao: Boolean(body.kakao_id?.trim()),
      has_line: Boolean(body.line_id?.trim()),
      has_telegram: Boolean(body.telegram_id?.trim()),
    },
  });
  return NextResponse.json({ member: data });
}
