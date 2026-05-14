"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/components/auth-provider";
import { trackClientEvent } from "@/components/analytics-tracker";
import { useLanguage } from "@/components/language-provider";
import { useSavedPlaces } from "@/components/saved-places-provider";
import { Place } from "@/lib/types";

export default function PlaceQuickActions({
  place,
  compact = false,
}: {
  place: Place;
  compact?: boolean;
}) {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { isSaved, toggleSaved } = useSavedPlaces();

  const detailUrl = useMemo(() => {
    if (typeof window === "undefined") return `/place/${place.slug}`;
    return `${window.location.origin}/place/${place.slug}`;
  }, [place.slug]);

  const saved = user?.role === "member" ? isSaved(place.id) : false;

  async function sharePlace() {
    const payload = {
      title: place.name,
      text: lang === "ko" ? "태국 여행자 커뮤니티 추천 장소" : "Recommended place from Thailand Guide",
      url: detailUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(payload);
      } else {
        await navigator.clipboard.writeText(detailUrl);
      }
      trackClientEvent("place_share_click", {
        place_id: place.id,
        slug: place.slug,
      });
    } catch {
      // ignore
    }
  }

  async function onToggleSaved() {
    if (user?.role !== "member") return;
    await toggleSaved(place.id);
    trackClientEvent("place_save_click", {
      place_id: place.id,
      slug: place.slug,
      action: saved ? "unsave" : "save",
    });
  }

  return (
    <div className={`mt-3 flex flex-wrap gap-2 ${compact ? "text-xs" : "text-sm"}`}>
      {user?.role === "member" ? (
        <button type="button" className="btn-secondary !px-2 !py-1" onClick={onToggleSaved}>
          {saved ? (lang === "ko" ? "저장됨" : "Saved") : lang === "ko" ? "저장" : "Save"}
        </button>
      ) : (
        <Link href="/auth/login" className="btn-secondary !px-2 !py-1">
          {lang === "ko" ? "로그인 후 저장" : "Login to save"}
        </Link>
      )}

      <button type="button" className="btn-secondary !px-2 !py-1" onClick={sharePlace}>
        {lang === "ko" ? "공유" : "Share"}
      </button>

      <Link
        href={`/submit/place-edit?q=${encodeURIComponent(place.name)}`}
        className="btn-secondary !px-2 !py-1"
      >
        {lang === "ko" ? "수정 요청" : "Request edit"}
      </Link>
    </div>
  );
}
