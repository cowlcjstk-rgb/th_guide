"use client";

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
};

export default function MePage() {
  const { lang } = useLanguage();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      setProfile(data?.member ?? null);
      setLoading(false);
    })();
  }, []);

  return (
    <section className="w-full space-y-6">
      <header className="panel p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{lang === "ko" ? "회원 정보" : "My Profile"}</h1>
      </header>
      <section className="panel p-5">
        {loading ? (
          <p className="text-sm text-slate-600">Loading...</p>
        ) : !profile ? (
          <p className="text-sm text-slate-600">{lang === "ko" ? "로그인이 필요합니다." : "Please login first."}</p>
        ) : (
          <div className="space-y-2 text-sm text-slate-700">
            <p>로그인 아이디 / Login ID: {profile.login_id || "-"}</p>
            <p>이름 / Name: {profile.name}</p>
            <p>전화번호 / Phone: {profile.phone}</p>
            <p>이메일 / Email: {profile.email}</p>
            <p>Kakao: {profile.kakao_id || "-"}</p>
            <p>LINE: {profile.line_id || "-"}</p>
            <p>Telegram: {profile.telegram_id || "-"}</p>
            <p>가입일 / Joined: {new Date(profile.created_at).toLocaleString()}</p>
          </div>
        )}
      </section>
    </section>
  );
}
