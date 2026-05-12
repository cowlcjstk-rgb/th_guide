"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/language-provider";

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
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

  const t =
    lang === "ko"
      ? {
          platform: "플랫폼",
          community: "커뮤니티",
          admin: "관리",
          home: "메인",
          places: "장소 탐색",
          map: "지도 플래너",
          commHome: "커뮤니티 홈",
          topRated: "평점 랭킹",
          latestReviews: "최신 리뷰",
          guide: "여행 가이드",
          adminPlaces: "장소 등록",
        }
      : {
          platform: "Platform",
          community: "Community",
          admin: "Admin",
          home: "Home",
          places: "Places",
          map: "Map Planner",
          commHome: "Community Home",
          topRated: "Top Rated",
          latestReviews: "Latest Reviews",
          guide: "Travel Guide",
          adminPlaces: "Place Admin",
        };

  return (
    <aside className="panel h-fit p-4 lg:sticky lg:top-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm font-bold tracking-tight text-slate-900">
          Bangkok Place
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
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t.platform}
          </p>
          <div className="space-y-1">
            <NavLink href="/" label={t.home} active={pathname === "/"} />
            <NavLink href="/places" label={t.places} active={pathname.startsWith("/places")} />
            <NavLink href="/map" label={t.map} active={pathname.startsWith("/map")} />
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t.community}
          </p>
          <div className="space-y-1">
            <NavLink href="/community" label={t.commHome} active={pathname === "/community"} />
            <NavLink href="/community#top-rated" label={t.topRated} active={pathname === "/community"} />
            <NavLink href="/community#latest-reviews" label={t.latestReviews} active={pathname === "/community"} />
            <NavLink href="/community#guide" label={t.guide} active={pathname === "/community"} />
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t.admin}
          </p>
          <div className="space-y-1">
            <NavLink href="/admin/places" label={t.adminPlaces} active={pathname.startsWith("/admin")} />
          </div>
        </div>
      </div>
    </aside>
  );
}
