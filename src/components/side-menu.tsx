"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/language-provider";

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-2 text-sm transition ${
        active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {label}
    </Link>
  );
}

export default function SideMenu() {
  const pathname = usePathname();
  const { lang, setLang } = useLanguage();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(window.location.hash || "");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const t = useMemo(
    () =>
      lang === "ko"
        ? {
            brand: "Thailand Guide",
            platform: "플랫폼",
            community: "커뮤니티",
            admin: "관리",
            home: "홈",
            places: "장소 탐색",
            map: "이동 경로",
            commHome: "커뮤니티 홈",
            topRated: "평점 랭킹",
            latestReviews: "최신 리뷰",
            routeShares: "동선 공유",
            travelGuide: "여행 가이드",
            faq: "자주 묻는 질문",
            adminPlaces: "장소 등록",
          }
        : {
            brand: "Thailand Guide",
            platform: "Platform",
            community: "Community",
            admin: "Admin",
            home: "Home",
            places: "Places",
            map: "Route Planner",
            commHome: "Community Home",
            topRated: "Top Rated",
            latestReviews: "Latest Reviews",
            routeShares: "Route Shares",
            travelGuide: "Travel Guide",
            faq: "FAQ",
            adminPlaces: "Place Admin",
          },
    [lang]
  );

  const isCommunity = pathname === "/community";

  return (
    <aside className="panel h-fit p-4 lg:sticky lg:top-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm font-bold tracking-tight text-slate-900">
          {t.brand}
        </Link>
        <div className="flex rounded-lg border border-slate-200 bg-white p-1">
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

      <div className="mt-4 space-y-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t.platform}</p>
          <div className="space-y-1">
            <NavLink href="/" label={t.home} active={pathname === "/"} />
            <NavLink href="/places" label={t.places} active={pathname.startsWith("/places")} />
            <NavLink href="/map" label={t.map} active={pathname.startsWith("/map")} />
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t.community}</p>
          <div className="space-y-1">
            <NavLink href="/community" label={t.commHome} active={isCommunity && hash === ""} />
            <NavLink href="/community#top-rated" label={t.topRated} active={isCommunity && hash === "#top-rated"} />
            <NavLink href="/community#latest-reviews" label={t.latestReviews} active={isCommunity && hash === "#latest-reviews"} />
            <NavLink href="/community#route-shares" label={t.routeShares} active={isCommunity && hash === "#route-shares"} />
            <NavLink href="/community#guide" label={t.travelGuide} active={isCommunity && hash === "#guide"} />
            <NavLink href="/community#faq" label={t.faq} active={isCommunity && hash === "#faq"} />
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t.admin}</p>
          <div className="space-y-1">
            <NavLink href="/admin/places" label={t.adminPlaces} active={pathname.startsWith("/admin")} />
          </div>
        </div>
      </div>
    </aside>
  );
}
