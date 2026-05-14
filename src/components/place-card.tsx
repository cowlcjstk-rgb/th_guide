"use client";

import Link from "next/link";
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
    : `${lang === "ko" ? "출처" : "Source"} ${lang === "ko" ? "운영팀" : "Ops Team"}`;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3>
        {place.is_featured ? <span className="chip">Featured</span> : null}
      </div>
      <p className="mt-2 text-sm text-slate-500">
        {city} · {place.district ?? "Unknown"} · {place.category ?? "General"}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="chip">{verifiedLabel}</span>
        <span className="chip">{sourceLabel}</span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-700">
        {place.description ?? (lang === "ko" ? "설명이 아직 없습니다." : "No description yet.")}
      </p>
      {(place.tags ?? []).length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {(place.tags ?? []).slice(0, 4).map((tag) => (
            <span key={tag} className="chip">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );

  if (disableLink) {
    return (
      <button
        type="button"
        className="card block w-full p-5 text-left"
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={`/place/${place.slug}`} className="card block p-5">
      {content}
    </Link>
  );
}
