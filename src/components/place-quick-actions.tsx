"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { trackClientEvent } from "@/components/analytics-tracker";
import { useLanguage } from "@/components/language-provider";
import { Place } from "@/lib/types";

const SAVED_KEY = "tg_saved_places_v1";

function readSavedIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

function writeSavedIds(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
}

export default function PlaceQuickActions({
  place,
  compact = false,
}: {
  place: Place;
  compact?: boolean;
}) {
  const { lang } = useLanguage();
  const [saved, setSaved] = useState(false);

  const detailUrl = useMemo(() => {
    if (typeof window === "undefined") return `/place/${place.slug}`;
    return `${window.location.origin}/place/${place.slug}`;
  }, [place.slug]);

  useEffect(() => {
    const ids = readSavedIds();
    setSaved(ids.includes(place.id));
  }, [place.id]);

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

  function toggleSave() {
    const ids = readSavedIds();
    const exists = ids.includes(place.id);
    const next = exists ? ids.filter((id) => id !== place.id) : [...ids, place.id];
    writeSavedIds(next);
    setSaved(!exists);
    trackClientEvent("place_save_click", {
      place_id: place.id,
      slug: place.slug,
      action: exists ? "unsave" : "save",
    });
  }

  return (
    <div className={`mt-3 flex flex-wrap gap-2 ${compact ? "text-xs" : "text-sm"}`}>
      <button type="button" className="btn-secondary !px-2 !py-1" onClick={toggleSave}>
        {saved ? (lang === "ko" ? "저장됨" : "Saved") : (lang === "ko" ? "저장" : "Save")}
      </button>
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
