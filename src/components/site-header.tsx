"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";

export default function SiteHeader() {
  const { lang, setLang } = useLanguage();
  const t =
    lang === "ko"
      ? { main: "메인", places: "장소", map: "지도", community: "커뮤니티", admin: "관리자" }
      : { main: "Main", places: "Places", map: "Map", community: "Community", admin: "Admin" };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-bold tracking-tight text-slate-900">
          Bangkok Place
        </Link>
        <div className="flex items-center gap-1 text-sm text-slate-700">
          <Link href="/" className="rounded-lg px-3 py-2 hover:bg-slate-100">
            {t.main}
          </Link>
          <Link href="/places" className="rounded-lg px-3 py-2 hover:bg-slate-100">
            {t.places}
          </Link>
          <Link href="/community" className="rounded-lg px-3 py-2 hover:bg-slate-100">
            {t.community}
          </Link>
          <Link href="/map" className="rounded-lg px-3 py-2 hover:bg-slate-100">
            {t.map}
          </Link>
          <Link href="/admin/places" className="rounded-lg px-3 py-2 hover:bg-slate-100">
            {t.admin}
          </Link>
          <div className="ml-2 flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              className={`rounded-md px-2 py-1 text-xs ${lang === "ko" ? "bg-slate-900 text-white" : "text-slate-600"}`}
              onClick={() => setLang("ko")}
            >
              KO
            </button>
            <button
              className={`rounded-md px-2 py-1 text-xs ${lang === "en" ? "bg-slate-900 text-white" : "text-slate-600"}`}
              onClick={() => setLang("en")}
            >
              EN
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
