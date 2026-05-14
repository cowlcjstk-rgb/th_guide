"use client";

import Link from "next/link";
import PlaceQuickActions from "@/components/place-quick-actions";
import { useLanguage } from "@/components/language-provider";
import { inferThaiCity } from "@/lib/geo";
import { localizePlaceName } from "@/lib/localize";
import { Place } from "@/lib/types";

type Props = {
  place: Place;
  disableLink?: boolean;
  onClick?: () => void;
};

export default function PlaceCard({ place, disableLink = false, onClick }: Props) {
  const { lang } = useLanguage();
  const title = localizePlaceName(place, lang);
  const city = inferThaiCity(place);
  const thumbnail = place.thumbnail?.trim() || null;

  const isPendingApproval = place.submission_status === "pending" || place.is_published === false;
  const locale = lang === "ko" ? "ko-KR" : "en-US";
  const verifiedLabel = place.last_verified_at
    ? `${lang === "ko" ? "검증" : "Verified"} ${new Date(place.last_verified_at).toLocaleDateString(locale)}`
    : isPendingApproval
      ? lang === "ko"
        ? "승인 대기"
        : "Pending approval"
      : `${lang === "ko" ? "운영 등록" : "Operational"} ${new Date(place.updated_at ?? place.created_at).toLocaleDateString(locale)}`;

  const sourceLabel = place.submitted_by
    ? `${lang === "ko" ? "출처" : "Source"} ${place.submitted_by}`
    : `${lang === "ko" ? "출처 운영팀" : "Source Ops Team"}`;

  const titleBlock = disableLink ? (
    <button type="button" className="text-left" onClick={onClick}>
      <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3>
    </button>
  ) : (
    <Link href={`/place/${place.slug}`}>
      <h3 className="text-base font-semibold tracking-tight text-slate-900 hover:underline">{title}</h3>
    </Link>
  );

  return (
    <article className="card p-4">
      <div className="flex gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {thumbnail ? (
            <img src={thumbnail} alt={title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#dbeafe,#d9f99d)] text-xs font-semibold text-slate-700">
              {city}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {titleBlock}
            {place.is_featured ? <span className="chip">Featured</span> : null}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {city} · {place.district ?? "Unknown"} · {place.category ?? "General"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="chip">{verifiedLabel}</span>
            <span className="chip">{sourceLabel}</span>
          </div>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-700">
        {place.description ?? (lang === "ko" ? "설명이 아직 없습니다." : "No description yet.")}
      </p>

      {(place.tags ?? []).length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {(place.tags ?? []).slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full border border-teal-200 bg-teal-50 px-2 py-1 text-[11px] text-teal-800">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <PlaceQuickActions place={place} compact />
    </article>
  );
}
