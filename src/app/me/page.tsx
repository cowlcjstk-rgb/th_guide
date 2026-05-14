"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";

type MemberProfile = {
  id: string;
  login_id?: string | null;
  name: string;
  phone: string;
  email: string;
  kakao_id: string | null;
  line_id: string | null;
  telegram_id: string | null;
  created_at: string;
  updated_at?: string | null;
};

type FormState = {
  name: string;
  phone: string;
  email: string;
  kakao_id: string;
  line_id: string;
  telegram_id: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  phone: "",
  email: "",
  kakao_id: "",
  line_id: "",
  telegram_id: "",
};

export default function MePage() {
  const { lang } = useLanguage();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const text =
    lang === "ko"
      ? {
          title: "회원 정보",
          needLogin: "로그인이 필요합니다.",
          loginCta: "로그인 페이지로 이동",
          readonlyId: "로그인 아이디 (수정 불가)",
          name: "이름",
          phone: "전화번호",
          email: "이메일",
          kakao: "카카오톡 아이디 (선택)",
          line: "라인 아이디 (선택)",
          telegram: "텔레그램 아이디 (선택)",
          joined: "가입일",
          updated: "최근 수정",
          save: "회원정보 저장",
          saving: "저장 중...",
          saveOk: "회원정보가 수정되었습니다.",
          duplicatePhone: "이미 사용 중인 전화번호입니다.",
          duplicateEmail: "이미 사용 중인 이메일입니다.",
          saveFail: "저장에 실패했습니다.",
        }
      : {
          title: "My Profile",
          needLogin: "Please login first.",
          loginCta: "Go to login",
          readonlyId: "Login ID (read-only)",
          name: "Name",
          phone: "Phone",
          email: "Email",
          kakao: "Kakao ID (optional)",
          line: "Line ID (optional)",
          telegram: "Telegram ID (optional)",
          joined: "Joined",
          updated: "Updated",
          save: "Save profile",
          saving: "Saving...",
          saveOk: "Profile updated successfully.",
          duplicatePhone: "This phone number is already in use.",
          duplicateEmail: "This email is already in use.",
          saveFail: "Failed to save profile.",
        };

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      const member = (data?.member ?? null) as MemberProfile | null;
      setProfile(member);
      if (member) {
        setForm({
          name: member.name ?? "",
          phone: member.phone ?? "",
          email: member.email ?? "",
          kakao_id: member.kakao_id ?? "",
          line_id: member.line_id ?? "",
          telegram_id: member.telegram_id ?? "",
        });
      }
      setLoading(false);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      if (data?.error === "duplicate phone") {
        setMessage(text.duplicatePhone);
        return;
      }
      if (data?.error === "duplicate email") {
        setMessage(text.duplicateEmail);
        return;
      }
      setMessage(data?.error || text.saveFail);
      return;
    }

    const member = (data?.member ?? null) as MemberProfile | null;
    if (member) {
      setProfile(member);
      setForm({
        name: member.name ?? "",
        phone: member.phone ?? "",
        email: member.email ?? "",
        kakao_id: member.kakao_id ?? "",
        line_id: member.line_id ?? "",
        telegram_id: member.telegram_id ?? "",
      });
    }
    setMessage(text.saveOk);
  }

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{text.title}</h1>
      </header>

      <section className="panel p-5">
        {loading ? (
          <p className="text-sm text-slate-600">Loading...</p>
        ) : !profile ? (
          <div className="space-y-3 text-sm text-slate-600">
            <p>{text.needLogin}</p>
            <Link href="/auth/login" className="btn-secondary inline-flex">
              {text.loginCta}
            </Link>
          </div>
        ) : (
          <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
            <label className="grid gap-1 text-sm text-slate-700 md:col-span-2">
              <span>{text.readonlyId}</span>
              <input className="input bg-slate-50" value={profile.login_id ?? "-"} disabled />
            </label>

            <label className="grid gap-1 text-sm text-slate-700">
              <span>{text.name}</span>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>

            <label className="grid gap-1 text-sm text-slate-700">
              <span>{text.phone}</span>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                required
              />
            </label>

            <label className="grid gap-1 text-sm text-slate-700">
              <span>{text.email}</span>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </label>

            <label className="grid gap-1 text-sm text-slate-700">
              <span>{text.kakao}</span>
              <input
                className="input"
                value={form.kakao_id}
                onChange={(e) => setForm((prev) => ({ ...prev, kakao_id: e.target.value }))}
              />
            </label>

            <label className="grid gap-1 text-sm text-slate-700">
              <span>{text.line}</span>
              <input
                className="input"
                value={form.line_id}
                onChange={(e) => setForm((prev) => ({ ...prev, line_id: e.target.value }))}
              />
            </label>

            <label className="grid gap-1 text-sm text-slate-700">
              <span>{text.telegram}</span>
              <input
                className="input"
                value={form.telegram_id}
                onChange={(e) => setForm((prev) => ({ ...prev, telegram_id: e.target.value }))}
              />
            </label>

            <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500 md:col-span-2">
              <p>
                {text.joined}: {new Date(profile.created_at).toLocaleString(lang === "ko" ? "ko-KR" : "en-US")}
              </p>
              <p className="mt-1">
                {text.updated}: {profile.updated_at ? new Date(profile.updated_at).toLocaleString(lang === "ko" ? "ko-KR" : "en-US") : "-"}
              </p>
            </div>

            {message ? <p className="text-sm text-slate-700 md:col-span-2">{message}</p> : null}

            <button className="btn-primary md:col-span-2" type="submit" disabled={saving}>
              {saving ? text.saving : text.save}
            </button>
          </form>
        )}
      </section>
    </section>
  );
}
